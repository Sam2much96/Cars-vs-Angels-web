/**
 * 
 * Gem
 * 
 * Features
 * (1) 3D gem item
 * (2) increases player's cash on collision
 * 
 * to do:
 * (1) set a collision shape on this object
 * (2) set the object to destroy and trigger a particles effect on destruction
 * (3) collision with this object should also increase the player's cash global cash balance
 */

export class Gem {
    constructor(loader = window.loader, scene = window.scene){

        loader.load('./gem.glb', (gltf) => {
            scene.add(gltf.scene);

        });
    }
}