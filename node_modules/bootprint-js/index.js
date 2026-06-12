const celestialObjects = [
    'sun',
    'mercury',
    'venus',
    'earth',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'moon'
  ];
  
  /**
   * @typedef {Object} CelestialObject
   * @property {string} type - The celestial object type (e.g., 'earth', 'moon')
   * @property {string} object - The name of the celestial object
   * @property {string} image - URL of an image of the celestial object
   * @property {string} fact - A fact about the celestial object
   * @property {string} image_id - Unique identifier for the image
   * @property {string} fact_id - Unique identifier for the fact
   */
  
  module.exports = {
    /**
     * Returns an image and a fact of the specified celestial object type(s).
     * @param {string | string[]} [type='random'] The celestial object type(s).
     * @returns {CelestialObject | CelestialObject[]} The data object(s).
     */
    async getAsync(type = 'random') {
      const isArray = Array.isArray(type);
      if ((typeof type !== 'string' && !isArray) || (isArray && (type = type.flat()) && !type.every(t => typeof t === 'string'))) {
        throw new TypeError("'type' must be a string or an array of strings");
      }
  
      type = type === 'random' 
        ? celestialObjects[Math.floor(Math.random() * celestialObjects.length)] 
        : !isArray 
          ? type.toLowerCase() 
          : [...new Set(type.map(t => t.toLowerCase()))];
      
      if (!isArray && !celestialObjects.includes(type)) {
        throw new TypeError(`'${type}' is not a valid type, the valid types are: ${celestialObjects.join(', ')}, random`);
      }
   
      if (isArray) {
        return Promise.all(type.map(t => this.getAsync(t)));
      }
  
      try {
        const spaceResponse = await fetch(`https://api.bootprint.space/all/${type}`).then(res => res.json());
        const { object, image, fact, image_id, fact_id } = spaceResponse;
  
        return { type, object, image, fact, image_id, fact_id };
      } catch (err) {
        throw new Error(`Failed to get type '${type}' from API:\n${err}`);
      }
    }
  };