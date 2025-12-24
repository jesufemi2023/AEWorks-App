export const calculateHaversineDistance = (coords1: string, coords2: string): number => {
    if (!coords1 || !coords2) return -1;

    const toRad = (value: number) => (value * Math.PI) / 180;

    try {
        const [lat1, lon1] = coords1.split(',').map(Number);
        const [lat2, lon2] = coords2.split(',').map(Number);

        if ([lat1, lon1, lat2, lon2].some(isNaN)) return -1;

        const R = 6371; // Radius of Earth in kilometers
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    } catch (e) {
        console.error("Coordinate parsing error:", e);
        return -1;
    }
};