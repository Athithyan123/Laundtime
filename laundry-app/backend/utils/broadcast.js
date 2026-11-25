// Shared SSE broadcast utility — imported by routes
const clients = new Set();

export const addClient  = (fn) => clients.add(fn);
export const removeClient = (fn) => clients.delete(fn);

export const broadcast = (type, payload) => {
  const msg = { type, payload, time: new Date().toISOString() };
  clients.forEach(send => {
    try { send(msg); } catch { clients.delete(send); }
  });
};
