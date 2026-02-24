/**
 * 
 * Gem
 * 
 * Features
 * (1) 3D gem item
 * (2) increases player's cash on collision
 */

export class Gem {
    constructor(loader = window.loader, scene = window.scene){

        loader.load('./gem.glb', (gltf) => {
            scene.add(gltf.scene);

        });
    }
}