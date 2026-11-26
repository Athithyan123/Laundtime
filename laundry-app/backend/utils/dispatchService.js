import Partner from "../models/Partner.js";
import Order from "../models/Order.js";
import { broadcast } from "./broadcast.js";

// ── Default City Centroids for fallback coordinates ──
const CITY_COORDINATES = {
  chennai:    { lat: 13.0827, lng: 80.2707 },
  bangalore:  { lat: 12.9716, lng: 77.5946 },
  bengaluru:  { lat: 12.9716, lng: 77.5946 },
  mumbai:     { lat: 19.0760, lng: 72.8777 },
  delhi:      { lat: 28.6139, lng: 77.2090 },
  hyderabad:  { lat: 17.3850, lng: 78.4867 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  madurai:    { lat: 9.9252,  lng: 78.1198 },
  trichy:     { lat: 10.7905, lng: 78.7047 },
  salem:      { lat: 11.6643, lng: 78.1460 },
  kochi:      { lat: 9.9312,  lng: 76.2673 },
  pune:       { lat: 18.5204, lng: 73.8567 },
  kolkata:    { lat: 22.5726, lng: 88.3639 }
};

/**
 * Calculate distance in kilometers using the Haversine formula
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999;
  const p1 = Number(lat1);
  const l1 = Number(lon1);
  const p2 = Number(lat2);
  const l2 = Number(lon2);
  if (isNaN(p1) || isNaN(l1) || isNaN(p2) || isNaN(l2)) return 999;

  const R = 6371; // Earth's radius in KM
  const dLat = (p2 - p1) * Math.PI / 180;
  const dLon = (l2 - l1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1 * Math.PI / 180) * Math.cos(p2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Resolve coordinate object from text/city or coordinates
 */
export function resolveCoordinates(cityOrAddress, fallback = { lat: 13.0827, lng: 80.2707 }) {
  if (!cityOrAddress) return fallback;
  const str = String(cityOrAddress).toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (str.includes(key)) {
      // Add slight deterministic spread based on string length to avoid stacking
      const offset = ((str.length % 7) - 3) * 0.005;
      return { lat: coords.lat + offset, lng: coords.lng + offset };
    }
  }
  return fallback;
}

/**
 * Find active eligible partners within radius (default 7 KM)
 */
export async function findNearbyEligiblePartners(order, stage = "pickup", searchRadiusKm = 7) {
  try {
    const requiredCategories =
      stage === "washing"
        ? ["washing", "full-service"]
        : stage === "delivery"
        ? ["delivery", "full-service"]
        : ["pickup", "full-service"];

    // Find all approved, available partners
    const partners = await Partner.find({
      status: "approved",
      isAvailable: true,
      category: { $in: requiredCategories }
    }).select("fullName mobile category address city pincode serviceArea location isAvailable serviceRadiusKm rejectedOrders");

    if (!partners || partners.length === 0) return [];

    const rejectedIds = (order.dispatchInfo?.rejectedPartners || []).map(id => String(id));

    // Target coordinates: customer location for pickup/delivery
    const targetLat = order.customerLocation?.lat || order.customerDetails?.lat || 13.0827;
    const targetLng = order.customerLocation?.lng || order.customerDetails?.lng || 80.2707;

    const eligible = [];

    for (const p of partners) {
      if (rejectedIds.includes(String(p._id))) continue;

      let pLat = p.location?.lat;
      let pLng = p.location?.lng;

      if (!pLat || !pLng || (pLat === 13.0827 && pLng === 80.2707 && p.city)) {
        const resolved = resolveCoordinates(p.city + " " + p.serviceArea);
        pLat = resolved.lat;
        pLng = resolved.lng;
      }

      const distKm = getDistanceKm(targetLat, targetLng, pLat, pLng);

      // Check if partner is within the search radius
      if (distKm <= searchRadiusKm) {
        eligible.push({
          partner: p,
          distanceKm: distKm,
          etaMinutes: Math.max(5, Math.round((distKm / 22) * 60) + 3) // ~22 km/h average speed in city
        });
      }
    }

    // Sort by closest distance first
    eligible.sort((a, b) => a.distanceKm - b.distanceKm);
    return eligible;
  } catch (err) {
    console.error("Error finding nearby eligible partners:", err.message);
    return [];
  }
}

/**
 * Automatic Partner Dispatching Engine
 * Requirements:
 * 7.1 Automatic Partner Detection within 7 KM radius
 * 7.2 Nearby Partner Notifications
 * 7.3 No Manual Admin Assignment
 * 7.7 Expand search radius if no partner accepts within time
 */
export async function triggerAutoDispatch(orderId, stage = "pickup") {
  try {
    const order = await Order.findById(orderId);
    if (!order) return { success: false, message: "Order not found" };

    // Set customer location coordinates if missing
    if (!order.customerLocation?.lat || !order.customerLocation?.lng) {
      const coords = resolveCoordinates(order.customerDetails?.city || order.customerDetails?.address);
      order.customerLocation = {
        lat: order.customerDetails?.lat || coords.lat,
        lng: order.customerDetails?.lng || coords.lng,
        address: order.customerDetails?.address || ""
      };
    }

    let searchRadius = order.dispatchInfo?.searchRadiusKm || 7;

    let nearby = await findNearbyEligiblePartners(order, stage, searchRadius);

    // If no partners found within 7 KM, automatically expand radius to 12 KM, then 18 KM
    if (nearby.length === 0 && searchRadius < 18) {
      searchRadius = searchRadius === 7 ? 12 : 18;
      order.dispatchInfo.searchRadiusKm = searchRadius;
      order.dispatchInfo.lastRadiusExpansionAt = new Date();
      nearby = await findNearbyEligiblePartners(order, stage, searchRadius);
    }

    const notifiedPartnerIds = nearby.map(n => n.partner._id);

    order.dispatchInfo = {
      ...order.dispatchInfo,
      autoDispatched: true,
      stage,
      searchRadiusKm: searchRadius,
      notifiedPartners: notifiedPartnerIds
    };

    await order.save();

    // 🔔 Real-Time Broadcast to all eligible partners
    broadcast("new_order_available", {
      orderId: order._id,
      trackingId: order.trackingId,
      customerDetails: {
        name: order.customerDetails?.name,
        city: order.customerDetails?.city,
        address: order.customerDetails?.address,
        pickupDate: order.customerDetails?.pickupDate,
        pickupTime: order.customerDetails?.pickupTime
      },
      stage,
      searchRadiusKm: searchRadius,
      eligiblePartnersCount: nearby.length,
      notifiedPartnerIds: notifiedPartnerIds.map(String)
    });

    // 🔔 Real-Time Broadcast to Admin Panel for Live Monitoring
    broadcast("dispatch_update", {
      orderId: order._id,
      trackingId: order.trackingId,
      stage,
      searchRadiusKm: searchRadius,
      notifiedPartners: nearby.map(n => ({
        id: n.partner._id,
        name: n.partner.fullName,
        mobile: n.partner.mobile,
        distanceKm: n.distanceKm,
        etaMinutes: n.etaMinutes
      })),
      customerLocation: order.customerLocation
    });

    return {
      success: true,
      searchRadiusKm: searchRadius,
      notifiedCount: nearby.length,
      partners: nearby.map(n => ({
        id: n.partner._id,
        name: n.partner.fullName,
        distanceKm: n.distanceKm
      }))
    };
  } catch (err) {
    console.error("triggerAutoDispatch error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * First-Come, First-Served Atomic Assignment Engine
 * Requirement 7.6: The first eligible partner to accept should be assigned automatically.
 * Once assigned, the order is no longer available to other partners.
 */
export async function assignFirstComeFirstServed(orderId, partnerId, stage = "pickup") {
  try {
    const partner = await Partner.findById(partnerId);
    if (!partner || partner.status !== "approved") {
      return { success: false, status: 403, message: "Partner is not approved" };
    }

    // Build atomic query condition based on stage
    let query = { _id: orderId };
    let updateFields = {};

    if (stage === "pickup" || ["pickup", "full-service"].includes(partner.category)) {
      query.pickupPartner = null;
      updateFields.pickupPartner = partner._id;
      updateFields.status = "confirmed";
      updateFields["dispatchInfo.stage"] = "pickup";
      updateFields["dispatchInfo.assignedAt"] = new Date();
      updateFields["dispatchInfo.trackingActive"] = true;
      updateFields["dispatchInfo.trackingStartedAt"] = new Date();

      // Initialize partner location near partner's last location
      if (partner.location?.lat) {
        updateFields["partnerLocation.lat"] = partner.location.lat;
        updateFields["partnerLocation.lng"] = partner.location.lng;
        updateFields["partnerLocation.updatedAt"] = new Date();
      }
    } else if (stage === "delivery" || partner.category === "delivery") {
      query.deliveryPartner = null;
      updateFields.deliveryPartner = partner._id;
      updateFields.status = "ready";
      updateFields["dispatchInfo.stage"] = "delivery";
      updateFields["dispatchInfo.assignedAt"] = new Date();
      updateFields["dispatchInfo.trackingActive"] = true;
      updateFields["dispatchInfo.trackingStartedAt"] = new Date();

      if (partner.location?.lat) {
        updateFields["partnerLocation.lat"] = partner.location.lat;
        updateFields["partnerLocation.lng"] = partner.location.lng;
        updateFields["partnerLocation.updatedAt"] = new Date();
      }
    } else if (stage === "washing" || partner.category === "washing") {
      query.washingPartner = null;
      updateFields.washingPartner = partner._id;
      updateFields["dispatchInfo.stage"] = "washing";
    }

    // Atomic update to ensure first-come, first-served
    const updatedOrder = await Order.findOneAndUpdate(
      query,
      {
        $set: updateFields,
        $push: {
          statusHistory: {
            status: updateFields.status || "confirmed",
            note: `Auto-assigned to partner ${partner.fullName} (First-come, first-served)`,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    ).populate("pickupPartner deliveryPartner washingPartner", "fullName mobile category");

    if (!updatedOrder) {
      return {
        success: false,
        status: 409,
        message: "This order was already accepted by another partner or is no longer available"
      };
    }

    // Set partner's current active order
    partner.activeOrder = updatedOrder._id;
    await partner.save();

    // 🔔 Notify Customer & Admin in real time
    broadcast("order_assigned", {
      orderId: updatedOrder._id,
      trackingId: updatedOrder.trackingId,
      status: updatedOrder.status,
      assignedPartner: {
        id: partner._id,
        name: partner.fullName,
        mobile: partner.mobile,
        category: partner.category,
        location: partner.location
      },
      trackingActive: true,
      stage
    });

    broadcast("order_updated", {
      _id: updatedOrder._id,
      trackingId: updatedOrder.trackingId,
      status: updatedOrder.status,
      pickupPartner: updatedOrder.pickupPartner,
      deliveryPartner: updatedOrder.deliveryPartner
    });

    return {
      success: true,
      order: updatedOrder,
      message: "Order successfully assigned to you!"
    };
  } catch (err) {
    console.error("assignFirstComeFirstServed error:", err.message);
    return { success: false, status: 500, message: err.message };
  }
}

/**
 * Handle Partner Rejection
 * Requirement 7.7: If a partner rejects, notify other nearby partners or expand search radius
 */
export async function handlePartnerRejection(orderId, partnerId) {
  try {
    const order = await Order.findById(orderId);
    if (!order) return { success: false, message: "Order not found" };

    if (!order.dispatchInfo) order.dispatchInfo = {};
    if (!order.dispatchInfo.rejectedPartners) order.dispatchInfo.rejectedPartners = [];

    const pIdStr = String(partnerId);
    if (!order.dispatchInfo.rejectedPartners.some(id => String(id) === pIdStr)) {
      order.dispatchInfo.rejectedPartners.push(partnerId);
    }

    // Record on partner record as well
    await Partner.findByIdAndUpdate(partnerId, {
      $addToSet: { rejectedOrders: orderId }
    });

    await order.save();

    // Re-trigger auto dispatch to notify other eligible partners or expand radius
    const reDispatchResult = await triggerAutoDispatch(order._id, order.dispatchInfo.stage || "pickup");

    return {
      success: true,
      message: "Order declined. Searching for other available partners...",
      ...reDispatchResult
    };
  } catch (err) {
    console.error("handlePartnerRejection error:", err.message);
    return { success: false, message: err.message };
  }
}
