class SocketStore {
    constructor() {
        this.map = new Map();
    }

    add(userId,socketId){
        const set = this.map.get(userId) || new Set();
        set.add(socketId);
        this.map.set(userId,set);
    }

    remove(userId,socketId){
        const set = this.map.get(userId);
        if (!set) {
            return;
        }
        set.delete(socketId);
        if (set.size == 0) {
            this.map.delete(userId);
        } else {
            this.map.set(userId,set);
        }
    }

    getSockets(userId){
        const set = this.map.get(userId);
        return set ? Array.from(set) : [];
    }
}

module.exports = new SocketStore();