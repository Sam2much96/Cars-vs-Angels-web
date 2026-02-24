/**
 * 
 * The Ground Level
 * 
 * Features:
 * (1) Contains the ground level / terrain of the world
 * 
 * 
 */

import * as THREE from 'three';
import * as CANNON from "cannon-es";

export class Terrain {

    /**
     * loads the 3d level mesh and applies static body collisions to it
     * @param loader 
     * 
     */
    constructor(loader = window.loader, scene = window.scene, world = window.world){

       
// ------------------------------------------------------
// (1) LOAD CITY MAP (STATIC ENVIRONMENT)
// ------------------------------------------------------

// bug:
// (1) city map level needs optimisation to fix occlusiion culling (done)
// (2) remove all materials from level object and fix positioning (done)
// (3) roads keep floating in model export, (1/2)

loader.load('./ground_mesh.glb', (gltf) => {
    const city = gltf.scene;
    city.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            obj.frustumCulled = false;
            obj.geometry.computeBoundingBox();
            obj.geometry.computeBoundingSphere();

            //console.log("Mesh found:", obj.name);

             //Add static world physics to the map terrain
            if (obj.name === "Terrain001"){
                // create terrain static body
                createFloorStaticBodyFromMesh(obj, world);

                 // Set brown terrain material
                obj.material = new THREE.MeshStandardMaterial({
                    color: 0x7A7A7A,   // Concrete grey
                    roughness: 0.9,
                    metalness: 0.0
                });

                // Optional: keep textures if terrain already has UVs
                obj.material.needsUpdate = true;
            }
        }
    });

    scene.add(city);

}, undefined, (err) => {
    console.error('CITY LOAD ERROR:', err);
});

    }
}



 function createFloorStaticBodyFromMesh(mesh: THREE.Mesh, world: any ): void {
    const FLOOR_THICKNESS = 5; // collision thickness (world units)

    if (!mesh.geometry || !mesh.geometry.attributes.position) {
        console.warn('Mesh has no geometry, skipping collider');
        return;
    }

    // Ensure bounding box exists
    mesh.geometry.computeBoundingBox();
    const bbox = mesh.geometry.boundingBox;
    if (!bbox) return;

    // Decompose world transform
    const worldPosition = new THREE.Vector3(0,0,0);
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();

    mesh.updateWorldMatrix(true, false);
    mesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

    // Get scaled size of the mesh
    const size = new THREE.Vector3();
    bbox.getSize(size);
    size.multiply(worldScale);

    // Create thick box collider
    const halfExtents = new CANNON.Vec3(
        size.x / 2,
        FLOOR_THICKNESS / 2,
        size.z / 2
    );

    const shape = new CANNON.Box(halfExtents);

    // Lower collider so top matches mesh surface
    const bodyPosition = new CANNON.Vec3(
        worldPosition.x,
        worldPosition.y - FLOOR_THICKNESS / 2,
        worldPosition.z
    );

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape,
        position: bodyPosition,
        quaternion: new CANNON.Quaternion(
            worldQuaternion.x,
            worldQuaternion.y,
            worldQuaternion.z,
            worldQuaternion.w
        )
    });

    world.addBody(body);

    console.log(`✅ Thick floor collider created for: ${mesh.name || 'unnamed'}`);
}
   



 /**
* Create a Cannon-es static body from a Three.js mesh
* @param mesh - Three.js mesh to convert to collision body
*/
function createStaticBodyFromMesh(mesh: THREE.Mesh): void {
        // ignore Landscape001 mesh, that is for the toonshader
        //if (mesh.name === "Landscape001"){
        //    return
        //}
        
        const geometry = mesh.geometry;
        
        // Check if geometry has valid attributes
        if (!geometry.attributes.position) {
            console.warn('Mesh has no position attributes, skipping collision body');
            return;
        }

        // Get world position and rotation
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        
        mesh.updateWorldMatrix(true, false);
        mesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

        // Create collision shape based on geometry type
        let shape: CANNON.Shape;
        
        if (geometry instanceof THREE.BoxGeometry) {
            // For box geometry, use Box shape
            const size = new THREE.Vector3();
            geometry.computeBoundingBox();
            geometry.boundingBox!.getSize(size);
            size.multiply(worldScale);
            
            shape = new CANNON.Box(new CANNON.Vec3(
                size.x / 2,
                size.y / 2, 
                size.z / 2
            ));
        } else if (geometry instanceof THREE.SphereGeometry) {
            // For sphere geometry, use Sphere shape
            const radius = geometry.parameters.radius * Math.max(worldScale.x, worldScale.y, worldScale.z);
            shape = new CANNON.Sphere(radius);
        } else if (geometry instanceof THREE.CylinderGeometry) {
            // For cylinder geometry, use Cylinder shape
            const params = geometry.parameters;
            shape = new CANNON.Cylinder(
                params.radiusTop * worldScale.x,
                params.radiusBottom * worldScale.x,
                params.height * worldScale.y,
                params.radialSegments
            );
        } else {
            // For complex geometry, use Trimesh (convex polyhedron)
            // Note: Trimesh is less performant but works for arbitrary shapes
            const vertices = geometry.attributes.position.array as Float32Array;
            const indices = geometry.index ? geometry.index.array as Uint32Array : undefined;
            
            if (indices && indices.length > 0) {
                // Use Trimesh for indexed geometry
                const cannonVertices = [];
                for (let i = 0; i < vertices.length; i += 3) {
                    cannonVertices.push(
                        vertices[i] * worldScale.x,
                        vertices[i + 1] * worldScale.y, 
                        vertices[i + 2] * worldScale.z
                    );
                }
                
                shape = new CANNON.Trimesh(cannonVertices, Array.from(indices));
            } else {
                console.warn('Complex mesh without indices, using simplified collision');
                // Fallback to bounding box
                geometry.computeBoundingBox();
                const box = geometry.boundingBox!;
                const size = new THREE.Vector3();
                box.getSize(size);
                size.multiply(worldScale);
                
                shape = new CANNON.Box(new CANNON.Vec3(
                    size.x / 2,
                    size.y / 2,
                    size.z / 2
                ));
            }
        }

        // Create static body
        const body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: shape,
            position: new CANNON.Vec3(
                worldPosition.x,
                worldPosition.y,
                worldPosition.z
            ),
            quaternion: new CANNON.Quaternion(
                worldQuaternion.x,
                worldQuaternion.y, 
                worldQuaternion.z,
                worldQuaternion.w
            )
        });

        // Add body to physics world and store reference
        window.world.addBody(body);
        //this.levelBodies.push(body);
        
        console.log(`Added static collision body for mesh: ${mesh.name || 'unnamed'}`);
    }
