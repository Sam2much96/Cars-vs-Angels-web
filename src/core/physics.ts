import * as CANNON from 'cannon-es';

export function createPhysicsWorld(): CANNON.World {
    const world = new CANNON.World();
    world.gravity.set(0, -10, 0);

    const sap = new CANNON.SAPBroadphase(world);
    (sap as any).useBoundingBoxes = true;
    world.broadphase = sap;

    world.allowSleep = true;
    world.defaultContactMaterial.friction = 10;
    return world;
}
