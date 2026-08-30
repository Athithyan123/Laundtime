import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey123laundtime2024";

// ── protect: verify JWT, attach req.user ──
export const protect = async (req, res, next) => {
  try {
    const token =
      req.header("Authorization")?.replace("Bearer ", "") ||
      req.header("x-auth-token");

    if (!token) return res.status(401).json({ message: "No token, authorization denied" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware:", err.message);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

// ── isAdmin: must be admin role ──
export const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// ── isRider: must be rider or admin ──
export const isRider = (req, res, next) => {
  if (!["rider", "admin"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Rider access required" });
  }
  next();
};

// ── isAdminOrSelf: admin or the user themselves ──
export const isAdminOrSelf = (req, res, next) => {
  if (req.user?.role === "admin" || req.user?._id.toString() === req.params.id) {
    return next();
  }
  return res.status(403).json({ message: "Access denied" });
};

// Default export for backward compatibility
export default protect;
