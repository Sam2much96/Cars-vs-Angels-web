/**
 * 
 * Rocks
 * 
 * Features:
 * (1) 3d rocks with collisions
 * (2) Used by rock spawner to spawn obstacles for the player
 * 
 */

export class Rock {
    public rockMesh : any
    constructor(loader = window.loader, scene = window.scene){

        // contructor logic
        // (1) load the 3d rock material
        // (2) apply collisions to it
        // (3) aplly a material to the rocl
                        loader.load('./rock_boulder.glb', (gltf) => {
                            this.rockMesh = gltf.scene;
                            
                   
                    scene.add(this.rockMesh);
                    })
   
   
        
    }

}