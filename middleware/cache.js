// import NodeCache from "node-cache";

// export const cache = new NodeCache();




import NodeCache from "node-cache";

// 🟡 Set global default TTL of 60 seconds
export const cache = new NodeCache({ stdTTL: 60 });
