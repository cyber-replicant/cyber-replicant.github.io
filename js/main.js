import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const twoPi = Math.PI * 2;

let camera, clock, scene, renderer, generalGroup;
let pointerDown = false;

const mouseCoords = new THREE.Vector2();

// Rigid bodies include all movable objects
const rigidBodies = [];

// Physics variables
const gravityConstant = 7.8;
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let physicsWorld;
const margin = 0.05;

const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();

// Custom shapes for collision with the platforms
// const pointA = 0.0;
// const pointB = 9.0;
// const pointC = 6.5;

// const platformCollisionShapes = [
//     new Float32Array([
//         pointA, pointA,  pointA,
//         pointB, pointA,  pointA,
//         pointC, pointC,  pointA,
//     ]),
//     new Float32Array([
//         pointA, pointA,  pointA,
//         pointB, pointA,  pointA,
//         pointC, -pointC,  pointA,
//     ]),
//     new Float32Array([
//         pointA, pointA,  pointA,
//         pointA, pointB,  pointA,
//         pointC, pointC,  pointA,
//     ]),
//     new Float32Array([
//         pointA, pointA,  pointA,
//         pointA, pointB,  pointA,
//         -pointC, pointC,  pointA,
//     ]),
//     new Float32Array([
//         pointA, pointA,  pointA,
//         -pointB, pointA,  pointA,
//         -pointC, pointC,  pointA,
//     ]),
//     new Float32Array([
//         pointA, pointA,  pointA,
//         -pointB, pointA,  pointA,
//         -pointC, -pointC,  pointA,
//     ]),
//     new Float32Array([
//         pointA, pointA,  pointA,
//         pointA, -pointB,  pointA,
//         pointC, -pointC,  pointA,
//     ]),
//     new Float32Array([
//         pointA, pointA, pointA,
//         pointA, -pointB, pointA,
//         -pointC, -pointC, pointA,
//     ]),
// ];


let transformAux1;
let tempBtVec3_1;


Ammo().then(function(AmmoLib) {

    Ammo = AmmoLib;

    setupScene();
    animate();
});

function setupPhysics() {

    collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, - gravityConstant, 0));

    transformAux1 = new Ammo.btTransform();
    tempBtVec3_1 = new Ammo.btVector3(0, 0, 0);
}

function setupScene() {

    // const gui = new GUI();

    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x444444);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.y = 10;
    camera.position.x = 0;
    camera.position.z = 25;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const orbit = new OrbitControls(camera, renderer.domElement);
    // orbit.enableZoom = false;

    setupLights(scene);
    setupPhysics();

    setupLevel(scene);

    render();
}

function setupLights(scene) {

    const lights = [];
    lights[0] = new THREE.PointLight(0xffffff, 1, 0);
    lights[1] = new THREE.PointLight(0xffffff, 1, 0);
    lights[2] = new THREE.PointLight(0xffffff, 1, 0);

    lights[0].position.set(0, 200, 0);
    lights[1].position.set(100, 200, 100);
    lights[2].position.set(-100, -200, -100);

    scene.add(lights[0]);
    scene.add(lights[1]);
    scene.add(lights[2]);
}

function setupLevel(scene) {

    // Ground
    // pos.set(0, -5, 0);
    // quat.set(0, 0, 0, 1);

    // const ground = createParalellepipedWithPhysics(40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFFFFF } ));
    // ground.receiveShadow = true;

    // Middle cylinder object
    const data = {
        radiusTop: 3,
        radiusBottom: 3,
        height: 200,
        radialSegments: 30,
        heightSegments: 1,
        openEnded: false,
        thetaStart: 0,
        thetaLength: twoPi
    };

    const cylinderGeometry = new THREE.CylinderGeometry(
        data.radiusTop,
        data.radiusBottom,
        data.height,
        data.radialSegments,
        data.heightSegments,
        data.openEnded,
        data.thetaStart,
        data.thetaLength,
    );

    const meshMaterial = new THREE.MeshPhongMaterial({
        color: 0x711C91,
        emissive: 0x380034,
        side: THREE.DoubleSide,
    });

    generalGroup = new THREE.Group();
    let cylinderObject = new THREE.Mesh(cylinderGeometry, meshMaterial);

    generalGroup.add(cylinderObject);
    scene.add(generalGroup);

    cylinderObject.position.y = -30;

    // Platforms
    setupPlatforms(scene);

    // Ball
    setupBall(scene);

    // for (const vertices of platformCollisionShapes) {
    //     let object = bloop(vertices, 0xEA00D9);
    //     generalGroup.add(object);
    // }
}


function createParalellepipedWithPhysics(sx, sy, sz, mass, pos, quat, material) {

    const object = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1 ), material);
    const shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5 ));
    shape.setMargin(margin);

    createRigidBody(object, shape, mass, pos, quat);
    return object;
}

function setupPlatforms(scene) {

    const numPlatforms = 10;
    const gapSize = -11;

    for (let i = 0; i < numPlatforms; i++) {

        generatePlatform(gapSize * i);
    }

    // object.rotation.y = Math.PI;
    // const platformGroup = new THREE.Group();
    // generalGroup.add(object);
    // platformGroup.rotation.x = Math.PI / 2;

    // scene.add(platformGroup);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function generatePlatform(platformY) {

    let chunkSize = twoPi / 8;

    const possibleRotations = [
        0,
        chunkSize,
        // chunkSize * 2,
        // chunkSize * 3,
        // chunkSize * 4,
        // chunkSize * 5,
        // chunkSize * 6,
        // chunkSize * 7,
    ];

    // const maxChunksToRemove = 4;
    // let chunksToRemove = getRandomInt(3, 5);

    // while (chunksToRemove > 0) {

    //     let randomIndex = getRandomInt(0,  possibleRotations.length);
    //     possibleRotations.splice(randomIndex, 1);
    //     chunksToRemove -= 1;
    // }

    for (let rotationY of possibleRotations) {

        let chunk = generatePieChunk();
        // generalGroup.add(chunk);
        // chunk.rotation.y = rotationY;
        // chunk.position.y = platformY;
    }

    // chunk = generatePieChunk();
    // chunk.rotation.y = Math.PI;
    // generalGroup.add(chunk);
}

function bloop(vertices, color) {

    const geometry = new THREE.BufferGeometry();
    // create a simple square shape. We duplicate the top left and bottom right
    // vertices because each vertex needs to appear once per triangle.

    // itemSize = 3 because there are 3 values (components) per vertex
    geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    const material = new THREE.MeshBasicMaterial( { color: color, side: THREE.DoubleSide } );
    const mesh = new THREE.Mesh( geometry, material );

    let pointA = new Ammo.btVector3(vertices[0][0], vertices[0][1], vertices[0][2]);
    let pointB = new Ammo.btVector3(vertices[1][0], vertices[1][1], vertices[1][2]);
    let pointC = new Ammo.btVector3(vertices[2][0], vertices[2][1], vertices[2][2]);
    // pointA = pointA.rotate(Math.PI / 2);
    // pointB = pointB.rotate(Math.PI / 2);
    // pointC = pointC.rotate(Math.PI / 2);

    const triangleMesh = new Ammo.btTriangleMesh();
    triangleMesh.addTriangle(pointA, pointB, pointC, true);
    triangleMesh.addTriangle(new Ammo.btVector3(0,0,0), new Ammo.btVector3(10,10,0), new Ammo.btVector3(10,0,0), true);
    const shape = new Ammo.btBvhTriangleMeshShape(triangleMesh, true, true);
    shape.setMargin(margin);

    // pos.set(vertices[0][0], vertices[0][1], vertices[0][2]);
    pos.set(0,0,0);
    quat.set(Math.PI / 2, 0, 0, 1);
    let body = createRigidBody(mesh, shape, 0, pos, quat);
    body.setRestitution(1);

    mesh.rotation.x = Math.PI / 2;
    return mesh;
}

function generatePieChunk() {

    let color = generateRandomColor();
    let emissive = generateRandomColor();

    const data = {
        radius: 9,
        height: 2,
        radialSegments: 30,
        heightSegments: 1,
        openEnded: false,
        thetaStart: 0,
        thetaLength: twoPi / 8
    };

    const cylinderGeometry = new THREE.CylinderGeometry(
        data.radius,
        data.radius,
        data.height,
        data.radialSegments,
        data.heightSegments,
        data.openEnded,
        data.thetaStart,
        data.thetaLength
    );

    const mass = 0;
    pos.set(0, 0, 0);
    quat.set(Math.PI / 2, 0, 0, 1);
    // const shape = new Ammo.btCylinderShape(
    //     new Ammo.btVector3(data.radius, data.height * 0.5, 50)
    // );
    // shape.setMargin(margin);

    // Custom shapes for collision with the platforms
    const pointA = 0.0;
    const pointB = 9.0;
    const pointC = 6.5;

    const shapeSize = 3.0;

    const platformCollisionPoints = new Float32Array([
        pointA, pointA,  pointA,
        pointB, pointA,  pointA,
        pointC, pointC,  pointA,

        pointA, pointA,  pointA + shapeSize,
        pointB, pointA,  pointA + shapeSize,
        pointC, pointC,  pointA + shapeSize,

        pointB, pointA,  pointA,
        pointB, pointA,  pointA + shapeSize,
        pointC, pointC,  pointA + shapeSize,

        pointC, pointC,  pointA,
        pointC, pointC,  pointA + shapeSize,
        pointB, pointA,  pointA,
    ]);

    const geometry = new THREE.BufferGeometry();
    // create a simple square shape. We duplicate the top left and bottom right
    // vertices because each vertex needs to appear once per triangle.

    geometry.setAttribute('position', new THREE.BufferAttribute(platformCollisionPoints, 3));
    const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    generalGroup.add(mesh);

    // let pointA = new Ammo.btVector3(vertices[0][0], vertices[0][1], vertices[0][2]);
    // let pointB = new Ammo.btVector3(vertices[1][0], vertices[1][1], vertices[1][2]);
    // let pointC = new Ammo.btVector3(vertices[2][0], vertices[2][1], vertices[2][2]);
    // pointA = pointA.rotate(Math.PI / 2);
    // pointB = pointB.rotate(Math.PI / 2);
    // pointC = pointC.rotate(Math.PI / 2);

    const triangleMesh = new Ammo.btTriangleMesh();

    triangleMesh.addTriangle(pointA, pointB, pointC, true);
    // triangleMesh.addTriangle(.btVector3(10,0,0), true);
    const shape = new Ammo.btBvhTriangleMeshShape(triangleMesh, true, true);
    shape.setMargin(margin);

    const meshMaterial = new THREE.MeshPhongMaterial({
        // color: 0x133E7C,
        // emissive: 0x072534,
        color: color,
        emissive: emissive,
        side: THREE.DoubleSide
    });

    const object = new THREE.Mesh(cylinderGeometry, meshMaterial);
    // let body = createRigidBody(object, shape, mass, pos, quat);
    // body.setRestitution(0.5);

    return object;
}

function setupBall(scene) {

    const ballMass = 5;

    const sphereData = {
        radius: 1,
        widthSegments: 32,
        heightSegments: 16,
        phiStart: 0,
        phiLength: twoPi,
        thetaStart: 0,
        thetaLength: Math.PI
    };

    const sphereGeometry = new THREE.SphereGeometry(
        sphereData.radius, sphereData.widthSegments, sphereData.heightSegments,
        sphereData.phiStart, sphereData.phiLength, sphereData.thetaStart, sphereData.thetaLength
    )

    const meshMaterial = new THREE.MeshPhongMaterial({
        color: 0x156289,
        emissive: 0x091833,
        side: THREE.DoubleSide,
        // flatShading: true
    });

    
    // const ballMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
    const ball = new THREE.Mesh(sphereGeometry, meshMaterial);
    const ballShape = new Ammo.btSphereShape(sphereData.radius);
    ballShape.setMargin(margin);

    ball.castShadow = true;
    ball.receiveShadow = true;

    pos.set(5, 10, 0);
    ball.position.x = pos.x;
    ball.position.y = pos.y;

    quat.set(0, 0, 0, 1);
    const ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);

    ballBody.setRestitution(1);
    // pos.copy( raycaster.ray.direction );
    // pos.add( raycaster.ray.origin );

    pos.set(0, -5, 0);
    pos.multiplyScalar(2);
    ballBody.setLinearVelocity(new Ammo.btVector3(pos.x, pos.y, pos.z));

    const ballGroup = new THREE.Group();
    ballGroup.add(ball);
    scene.add(ballGroup);
}

function createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {

    if (pos) {
        object.position.copy(pos);
    } else {
        pos = object.position;
    }

    if (quat) {
        object.quaternion.copy(quat);
    } else {
        quat = object.quaternion;
    }

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    const motionState = new Ammo.btDefaultMotionState(transform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
    const body = new Ammo.btRigidBody(rbInfo);

    body.setFriction(0.5);

    if (vel) {
        body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));
    }

    if (angVel) {
        body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));
    }

    object.userData.physicsBody = body;
    object.userData.collided = false;

    scene.add(object);

    if (mass > 0) {

        rigidBodies.push(object);

        // Disable deactivation
        body.setActivationState(4);
    }

    physicsWorld.addRigidBody(body);
    return body;

}

function generateRandomColor() {

    return Math.floor(Math.random() * ( 1 << 24 ));
}

function animate() {

    requestAnimationFrame(animate);

    render();
    // stats.update();

}

function render() {

    const deltaTime = clock.getDelta();
    updatePhysics(deltaTime);

    renderer.render(scene, camera);
}

function updatePhysics(deltaTime) {

    // Step world
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update rigid bodies
    for (let i = 0, il = rigidBodies.length; i < il; i ++) {

        const objThree = rigidBodies[i];
        const objPhys = objThree.userData.physicsBody;
        const ms = objPhys.getMotionState();

        if (ms) {
            ms.getWorldTransform(transformAux1);
            const p = transformAux1.getOrigin();
            const q = transformAux1.getRotation();
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

            objThree.userData.collided = false;
        }
    }

    // for (let i = 0, il = dispatcher.getNumManifolds(); i < il; i ++) {

    //     const contactManifold = dispatcher.getManifoldByIndexInternal(i);
    //     const rb0 = Ammo.castObject(contactManifold.getBody0(), Ammo.btRigidBody);
    //     const rb1 = Ammo.castObject(contactManifold.getBody1(), Ammo.btRigidBody);

    //     const threeObject0 = Ammo.castObject(rb0.getUserPointer(), Ammo.btVector3).threeObject;
    //     const threeObject1 = Ammo.castObject(rb1.getUserPointer(), Ammo.btVector3).threeObject;

    //     if (!threeObject0 && !threeObject1) {
    //         continue;
    //     }

    //     const userData0 = threeObject0 ? threeObject0.userData : null;
    //     const userData1 = threeObject1 ? threeObject1.userData : null;

    //     const breakable0 = userData0 ? userData0.breakable : false;
    //     const breakable1 = userData1 ? userData1.breakable : false;

    //     const collided0 = userData0 ? userData0.collided : false;
    //     const collided1 = userData1 ? userData1.collided : false;

    //     if ((!breakable0 && !breakable1) || (collided0 && collided1)) {
    //         continue;
    //     }

    //     let contact = false;
    //     let maxImpulse = 0;
    //     for ( let j = 0, jl = contactManifold.getNumContacts(); j < jl; j ++ ) {

    //         const contactPoint = contactManifold.getContactPoint( j );

    //         if ( contactPoint.getDistance() < 0 ) {

    //             contact = true;
    //             const impulse = contactPoint.getAppliedImpulse();

    //             if ( impulse > maxImpulse ) {

    //                 maxImpulse = impulse;
    //                 const pos = contactPoint.get_m_positionWorldOnB();
    //                 const normal = contactPoint.get_m_normalWorldOnB();
    //                 impactPoint.set( pos.x(), pos.y(), pos.z() );
    //                 impactNormal.set( normal.x(), normal.y(), normal.z() );

    //             }

    //             break;

    //         }

    //     }

    //     // If no point has contact, abort
    //     if ( ! contact ) continue;

    //     // Subdivision

    //     const fractureImpulse = 250;

    //     if ( breakable0 && ! collided0 && maxImpulse > fractureImpulse ) {

    //         const debris = convexBreaker.subdivideByImpact( threeObject0, impactPoint, impactNormal, 1, 2, 1.5 );

    //         const numObjects = debris.length;
    //         for ( let j = 0; j < numObjects; j ++ ) {

    //             const vel = rb0.getLinearVelocity();
    //             const angVel = rb0.getAngularVelocity();
    //             const fragment = debris[ j ];
    //             fragment.userData.velocity.set( vel.x(), vel.y(), vel.z() );
    //             fragment.userData.angularVelocity.set( angVel.x(), angVel.y(), angVel.z() );

    //             createDebrisFromBreakableObject( fragment );

    //         }

    //         objectsToRemove[ numObjectsToRemove ++ ] = threeObject0;
    //         userData0.collided = true;

    //     }

    //     if ( breakable1 && ! collided1 && maxImpulse > fractureImpulse ) {

    //         const debris = convexBreaker.subdivideByImpact( threeObject1, impactPoint, impactNormal, 1, 2, 1.5 );

    //         const numObjects = debris.length;
    //         for ( let j = 0; j < numObjects; j ++ ) {

    //             const vel = rb1.getLinearVelocity();
    //             const angVel = rb1.getAngularVelocity();
    //             const fragment = debris[ j ];
    //             fragment.userData.velocity.set( vel.x(), vel.y(), vel.z() );
    //             fragment.userData.angularVelocity.set( angVel.x(), angVel.y(), angVel.z() );

    //             createDebrisFromBreakableObject( fragment );

    //         }

    //         objectsToRemove[ numObjectsToRemove ++ ] = threeObject1;
    //         userData1.collided = true;

    //     }

    // }

    // for ( let i = 0; i < numObjectsToRemove; i ++ ) {
    //     removeDebris( objectsToRemove[ i ] );
    // }

    // numObjectsToRemove = 0;
}

window.addEventListener('resize', function () {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);


const raycaster = new THREE.Raycaster();
let mouseX = 0, mouseY = 0;

window.addEventListener('pointerdown', function(event) {

    // mouseCoords.set(
    //     ( event.clientX / window.innerWidth ) * 2 - 1,
    //     - ( event.clientY / window.innerHeight ) * 2 + 1
    // );

    event.preventDefault();

    pointerDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    return false;
});

window.addEventListener('pointerup', function(event) {

    event.preventDefault();

    // mouseCoords.set(
    //     ( event.clientX / window.innerWidth ) * 2 - 1,
    //     - ( event.clientY / window.innerHeight ) * 2 + 1
    // );

    pointerDown = false;
    return false;
});

window.addEventListener('pointermove', function(event) {

    // mouseCoords.set(
    //     ( event.clientX / window.innerWidth ) * 2 - 1,
    //     - ( event.clientY / window.innerHeight ) * 2 + 1
    // );

    if (!pointerDown) {
        return;
    }

    event.preventDefault();

    let deltaX = event.clientX - mouseX;
    let deltaY = event.clientY - mouseY;
    mouseX = event.clientX;
    mouseY = event.clientY;

    // generalGroup.rotation.x += deltaX / 100;
    generalGroup.rotation.y -= deltaX / 50;
    return false;
});

