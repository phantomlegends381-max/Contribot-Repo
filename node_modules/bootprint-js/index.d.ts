declare module 'bootprint' {
    interface CelestialObject {
      type: string;        // The requested celestial object type (e.g., 'earth')
      object: string;      // The celestial object name from the API (e.g., 'earth')
      image: string;       // URL of the image
      fact: string;        // A fact about the celestial object
      image_id: string;    // Unique identifier for the image
      fact_id: string;     // Unique identifier for the fact
    }
  
    namespace fns {
      /**
       * Returns an image and a fact of the specified celestial object type(s).
       * @param type The celestial object type(s), defaults to 'random'.
       * @returns A promise resolving to a single CelestialObject or an array of CelestialObject.
       */
      export function getAsync(type?: string | string[]): Promise<CelestialObject | CelestialObject[]>;
    }
  
    export = fns;
  }