import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const twoPi = Math.PI * 2;

let camera, clock, scene, renderer, generalGroup, ballGroup, ball, bloop, ballBounds, cubeBounds;
let pointerDown = false;
let platforms = [];

const mouseCoords = new THREE.Vector2();

// Rigid bodies include all movable objects
const rigidBodies = [];

// Physics variables
const gravityConstant = 20;
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let physicsWorld;
const margin = 0.05;

let armMovement = 1;

const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();

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
    camera.position.y = 3.6;
    camera.position.x = 5.3;
    camera.position.z = 12;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // const orbit = new OrbitControls(camera, renderer.domElement);
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

    generalGroup = new THREE.Group();

    // Ground
    // pos.set(5, -5, 0);
    // quat.set(0, 0, 0, 1);

    // const ground = createParalellepipedWithPhysics(
    //     5, 1, 5, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFFFFF } )
    // );
    // ground.receiveShadow = true;

    // pos.set(5, -5, 5);
    // quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 5);
    // console.log(quat);
    // // quat.set(0, Math.PI/2, 0, 1);

    // // mesh.rotateOnAxis( new THREE.Vector3( 0, 1, 0 ), rotationY );

    // let moo = createParalellepipedWithPhysics(
    //     5, 1, 5, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFFFFF } )
    // );

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

    let cylinderObject = new THREE.Mesh(cylinderGeometry, meshMaterial);

    generalGroup.add(cylinderObject);
    scene.add(generalGroup);

    cylinderObject.position.y = -30;

    // Platforms
    // setupHinge();
    setupPlatforms(scene);

    // Ball
    setupBall(scene);

    // for (const vertices of platformCollisionShapes) {
    //     let object = bloop(vertices, 0xEA00D9);
    //     generalGroup.add(object);
    // }
}

function setupPlatforms(scene) {

    const numPlatforms = 10;
    const gapSize = -11;

    // for (let i = 0; i < numPlatforms; i++) {

    let i = 0;
    generatePlatform(1);
    // }

    // object.rotation.y = Math.PI;
    // const platformGroup = new THREE.Group();
    // generalGroup.add(object);
    // platformGroup.rotation.x = Math.PI / 2;

    // scene.add(platformGroup);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

let hinge, arm;

function setupHinge() {

    // The base
    const ropePos = new THREE.Vector3( 0, 0, 0 );
    const ropeLength = 4;
    const armMass = 2;
    const armLength = 3;
    const pylonHeight = ropePos.y + ropeLength;
    const baseMaterial = new THREE.MeshPhongMaterial( { color: 0x606060 } );
    pos.set( 0, 0, 0 ) ;
    quat.set( 0, 0, 0, 1 );
    const base = createParalellepipedWithPhysics( 1, 0.2, 1, 0, pos, quat, baseMaterial );
    base.castShadow = true;
    base.receiveShadow = true;
    pos.set( ropePos.x, 0.5 * pylonHeight, ropePos.z - armLength );
    const pylon = createParalellepipedWithPhysics( 0.4, pylonHeight, 0.4, 0, pos, quat, baseMaterial );
    pylon.castShadow = true;
    pylon.receiveShadow = true;
    pos.set( ropePos.x, pylonHeight + 0.2, ropePos.z - 0.5 * armLength );
    arm = createParalellepipedWithPhysics( 2, 0.5, 2, armMass, pos, quat, baseMaterial );
    arm.castShadow = true;
    arm.receiveShadow = true;       

    // Glue the rope extremes to the ball and the arm
    // const influence = 1;
    // ropeSoftBody.appendAnchor( 0, ball.userData.physicsBody, true, influence );
    // ropeSoftBody.appendAnchor( ropeNumSegments, arm.userData.physicsBody, true, influence );

    // Hinge constraint to move the arm
    const pivotA = new Ammo.btVector3( 0, pylonHeight * 0.5, 0 );
    const pivotB = new Ammo.btVector3( 0, - 0.2, - armLength * 0.5 );
    const axis = new Ammo.btVector3( 0, 1, 0 );
    hinge = new Ammo.btHingeConstraint( pylon.userData.physicsBody, arm.userData.physicsBody, pivotA, pivotB, axis, axis, true );
    physicsWorld.addConstraint( hinge, true );
}

function generatePlatform(platformY) {

    let chunkSize = twoPi / 8;

    const possibleRotations = [
        0,
        chunkSize,
        chunkSize * 2,
        chunkSize * 3,
        chunkSize * 4,
        chunkSize * 5,
        chunkSize * 6,
        chunkSize * 7,
    ];

    // const maxChunksToRemove = 4;
    // let chunksToRemove = getRandomInt(3, 5);

    // while (chunksToRemove > 0) {

    //     let randomIndex = getRandomInt(0,  possibleRotations.length);
    //     possibleRotations.splice(randomIndex, 1);
    //     chunksToRemove -= 1;
    // }

    const positions = [
        new THREE.Vector3(5, 5, 0),
        // new THREE.Vector3(5, 5, 5),
        // new THREE.Vector3(5, 5, -5),
        // // new THREE.Vector3(-5, 5, 0),
        // new THREE.Vector3(-5, 5, -5),
        // // new THREE.Vector3(-5, 5, 5),
        // new THREE.Vector3(0, 5, 5),
        // new THREE.Vector3(0, 5, -5),
    ];

    for (let position of positions) {

        // let chunk = generatePieChunk(rotationY);
        // generalGroup.add(chunk);
        // chunk.rotation.y = rotationY;
        // chunk.position.y = platformY;
        pos.copy(position);
        quat.set(0,0,0,1);
        // pos.set(5, -5, 0);
        // quat.set(0.383, 0, 0.383, 0.924);

        // rx, ry and rz are target radians
        // var euler = new THREE.Euler(0,0,0);
        // // var quaternion = new THREE.Quaternion();
        // quat.setFromEuler(euler);
        // quat.setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI / 2);
        // object.rotation.setFromQuaternion(quaternion);

        let sx = 10;
        let sy = 1;
        let sz = 5;
        let material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });

        bloop = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1 ), material);
        // const shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5 ));
        // shape.setMargin(margin);
        bloop.geometry.computeBoundingBox();
        // let box = bloop.geometry.boundingBox;
        // let min = new THREE.Vector3(box.min.x * 0.5, box.min.y * 0.5, box.min.z * 0.5);
        // let max = new THREE.Vector3(box.max.x * 0.5, box.max.y * 0.5, box.max.z * 0.5);
        // console.log(box)

        generalGroup.add(bloop);

        // boop = createParalellepipedWithPhysics(
        //     5, 1, 5, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFFFFF } )
        // );
        // platforms.push(boop);
        cubeBounds = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        cubeBounds.setFromObject(bloop);
        console.log(cubeBounds);
    }

    // chunk = generatePieChunk();
    // chunk.rotation.y = Math.PI;
    // generalGroup.add(chunk);
}

function createParalellepipedWithPhysics(sx, sy, sz, mass, pos, quat, material) {

    const object = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1 ), material);
    const shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5 ));
    shape.setMargin(margin);

    generalGroup.add(object);
    let body = createRigidBody(object, shape, mass, pos, new THREE.Quaternion(0,0,0,1));
    body.setRestitution(1);
    platforms.push(body);

    // const ms = platform.getMotionState();
    setObjectRotation(object, quat);

    // q = transform.getRotation();
    // // quat.set(1, q.x(), generalGroup.rotation.y, q.z());
    // console.log(q.x() + " " + q.y() + " " + q.z() + " " + q.w());

    return object;
}

function setObjectRotation(object, q) {

    let body = object.userData.physicsBody;

    const transform = body.getWorldTransform();
    transform.setRotation(new Ammo.btQuaternion(q.x, q.y, q.z, q.w));
    body.setWorldTransform(transform);
    object.quaternion.copy(q);
}

// function bloop(vertices, color) {

//     const geometry = new THREE.BufferGeometry();
//     // create a simple square shape. We duplicate the top left and bottom right
//     // vertices because each vertex needs to appear once per triangle.

//     // itemSize = 3 because there are 3 values (components) per vertex
//     geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
//     const material = new THREE.MeshBasicMaterial( { color: color, side: THREE.DoubleSide } );
//     const mesh = new THREE.Mesh( geometry, material );

//     let pointA = new Ammo.btVector3(vertices[0][0], vertices[0][1], vertices[0][2]);
//     let pointB = new Ammo.btVector3(vertices[1][0], vertices[1][1], vertices[1][2]);
//     let pointC = new Ammo.btVector3(vertices[2][0], vertices[2][1], vertices[2][2]);
//     // pointA = pointA.rotate(Math.PI / 2);
//     // pointB = pointB.rotate(Math.PI / 2);
//     // pointC = pointC.rotate(Math.PI / 2);

//     const triangleMesh = new Ammo.btTriangleMesh();
//     triangleMesh.addTriangle(pointA, pointB, pointC, true);
//     triangleMesh.addTriangle(new Ammo.btVector3(0,0,0), new Ammo.btVector3(10,10,0), new Ammo.btVector3(10,0,0), true);
//     const shape = new Ammo.btBvhTriangleMeshShape(triangleMesh, true, true);
//     shape.setMargin(margin);

//     // pos.set(vertices[0][0], vertices[0][1], vertices[0][2]);
//     pos.set(0,0,0);
//     quat.set(Math.PI / 2, 0, 0, 1);
//     let body = createRigidBody(mesh, shape, 0, pos, quat);
//     body.setRestitution(1);

//     mesh.rotation.x = Math.PI / 2;
//     return mesh;
// }

function generatePieChunk(rotationY) {

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

    const meshMaterial = new THREE.MeshPhongMaterial({
        // color: 0x133E7C,
        // emissive: 0x072534,
        color: color,
        emissive: emissive,
        side: THREE.DoubleSide
    });

    const object = new THREE.Mesh(cylinderGeometry, meshMaterial);
    generalGroup.add(object);
    object.rotation.y = rotationY;

    // const shape = new Ammo.btCylinderShape(
    //     new Ammo.btVector3(data.radius, data.height * 0.5, 50)
    // );
    // shape.setMargin(margin);

    // Custom shapes for collision with the platforms
    const pointA = 0.0;
    const pointB = 7.0;
    const pointC = 5.0;
    const pointD = 2.0;

    const collisionPoints = new Float32Array([
        pointA, pointA,  pointA,
        pointB, pointA,  pointA,
        pointC, pointC,  pointA,

        pointA, pointA,  pointD,
        pointB, pointA,  pointD,
        pointC, pointC,  pointD,

        pointB, pointA,  pointA,
        pointB, pointA,  pointD,
        pointC, pointC,  pointD,

        pointC, pointC,  pointA,
        pointC, pointC,  pointD,
        pointB, pointA,  pointA,

        pointA, pointA,  pointA,
        pointB, pointA,  pointA,
        pointA, pointA,  pointD,

        pointA, pointA,  pointD,
        pointB, pointA,  pointD,
        pointB, pointA,  pointA,

        pointA, pointA,  pointA,
        pointC, pointC,  pointA,
        pointA, pointA,  pointD,

        pointA, pointA,  pointD,
        pointC, pointC,  pointD,
        pointC, pointC,  pointA,
    ]);

    const geometry = new THREE.BufferGeometry();
    // create a simple square shape. We duplicate the top left and bottom right
    // vertices because each vertex needs to appear once per triangle.

    geometry.setAttribute('position', new THREE.BufferAttribute(collisionPoints, 3));
    const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    // mesh.position.z = object.position.z;
    // mesh.rotation.x = Math.PI / 2;
    // mesh.rotation.y = rotationY;
    // mesh.quaternion.y = Math.PI / 2;
    // mesh.rotateOnAxis( new THREE.Vector3( 0, 1, 0 ), rotationY );
    // console.log(mesh.quaternion);
    generalGroup.add(mesh);

    const triangleMesh = new Ammo.btTriangleMesh();
    const numTriangles = collisionPoints.length / 3 / 3;

    for (let i = 0; i < numTriangles; i++) {

        let pointOne = new Ammo.btVector3(collisionPoints[i], collisionPoints[i+1], collisionPoints[i+2]);
        let pointTwo = new Ammo.btVector3(collisionPoints[i+3], collisionPoints[i+4], collisionPoints[i+5]);
        let pointThree = new Ammo.btVector3(collisionPoints[i+6], collisionPoints[i+7], collisionPoints[i+8]);

        triangleMesh.addTriangle(pointOne, pointTwo, pointThree);
    }

    const shape = new Ammo.btBvhTriangleMeshShape(triangleMesh, true, true);
    shape.setMargin(margin);

    const mass = 0;
    pos.set(object.position.x, object.position.y, object.position.z);
    // quat.set(0, 0, 0, 1);
    // quat.set(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, 1);
    // quat.set(Math.PI / 2, mesh.rotation.y, mesh.rotation.z, 1);
    // quat.set(Math.PI / 5, 0, 0, 1);

    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

    // quat = new Ammo.btQuaternion(new Ammo.btVector3(0,1,0),-Math.PI/2)
    // let fuck = new Ammo.btQuaternion(new Ammo.btVector3(0,1,0),-Math.PI/2);

    let body = createRigidBody(mesh, shape, mass, pos, quat);
    // let body = createRigidBody(object, shape, mass, null, null);
    body.setRestitution(0.8);
    platforms.push(body);

    return mesh;
}

function setupBall(scene) {

    const ballMass = 5;
    const ballRadius = 1;

    const sphereData = {
        radius: ballRadius,
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
    ball = new THREE.Mesh(sphereGeometry, meshMaterial);
    const ballShape = new Ammo.btSphereShape(sphereData.radius);
    ballShape.setMargin(margin);

    ball.castShadow = true;
    ball.receiveShadow = true;

    pos.set(5, 10, 0);
    ball.position.copy(pos);

    ballBounds = new THREE.Sphere(pos, ballRadius);

    quat.set(0, 0, 0, 1);
    const ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);

    ballBody.setRestitution(1);
    // pos.copy( raycaster.ray.direction );
    // pos.add( raycaster.ray.origin );

    pos.set(0, -5, 0);
    pos.multiplyScalar(2);
    ballBody.setLinearVelocity(new Ammo.btVector3(pos.x, pos.y, pos.z));

    ballGroup = new THREE.Group();
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
    // body.setAngularFactor( 0, 1, 0 );
    // body.setRollingFriction(10);

    if (vel) {
        body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));
    }

    if (angVel) {
        body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));
    }

    object.userData.physicsBody = body;
    object.userData.collided = false;

    // scene.add(object);

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

function checkCollisions() {

    if (ballBounds.intersectsBox(cubeBounds)) {
        // ball.material.opacity = 0.1;
        ball.userData.physicsBody.setLinearVelocity(new Ammo.btVector3(0,15,0));
        console.log("SDFSDF");
    }
}

function animate() {

    ballBounds.copy(ball.geometry.boundingSphere).applyMatrix4(ball.matrixWorld);
    cubeBounds.copy(bloop.geometry.boundingBox).applyMatrix4(bloop.matrixWorld);
    checkCollisions();    

    render();
    requestAnimationFrame(animate);
}

function render() {

    const deltaTime = clock.getDelta();
    updatePhysics(deltaTime);

    renderer.render(scene, camera);
    // camera.lookAt(ballGroup.position);
}

function updatePhysics(deltaTime) {

    // Hinge control
    // if (pointerDown) {
    //     hinge.enableAngularMotor( true, 1.5 * armMovement, 50 );
    // }

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


    // mouseCoords.set(
    //     ( event.clientX / window.innerWidth ) * 2 - 1,
    //     - ( event.clientY / window.innerHeight ) * 2 + 1
    // );
    // console.log(mouseCoords);

    // raycaster.setFromCamera( mouseCoords, camera );

    // // Creates a ball and throws it
    // const ballMass = 35;
    // const ballRadius = 0.4;

    // const ballMaterial = new THREE.MeshPhongMaterial({
    //     color: 0x156289,
    //     emissive: 0x091833,
    // });

    // const ball = new THREE.Mesh( new THREE.SphereGeometry( ballRadius, 14, 10 ), ballMaterial );
    // ballGroup.add(ball);
    // ball.castShadow = true;
    // ball.receiveShadow = true;
    // const ballShape = new Ammo.btSphereShape( ballRadius );
    // ballShape.setMargin( margin );
    // pos.copy( raycaster.ray.direction );
    // pos.add( raycaster.ray.origin );
    // quat.set( 0, 0, 0, 1 );
    // const ballBody = createRigidBody( ball, ballShape, ballMass, pos, quat );

    // pos.copy( raycaster.ray.direction );
    // pos.multiplyScalar( 24 );
    // ballBody.setLinearVelocity( new Ammo.btVector3( pos.x, pos.y, pos.z ) );






    pointerDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    return false;
});

let rot = new THREE.Vector3(0,0,0);

window.addEventListener('pointerup', function(event) {

    event.preventDefault();

    // mouseCoords.set(
    //     ( event.clientX / window.innerWidth ) * 2 - 1,
    //     - ( event.clientY / window.innerHeight ) * 2 + 1
    // );

    // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(-rot.x,-rot.y,-rot.z));
    // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,0,0));
    // arm.userData.physicsBody.setLinearVelocity(new Ammo.btVector3(0,0,0));
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

    generalGroup.rotation.y -= deltaX / 100;
    // arm.rotation.y -= deltaX / 50;
    // var euler = new THREE.Euler(arm.rotation.x,arm.rotation.y,arm.rotation.z);
    // quat.setFromEuler(euler);
    // // console.log(boop.rotation);
    // // console.log(boop.quaternion);
    // setObjectRotation(arm, quat);
    // rot.set(0,deltaX/2,0);
    // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(rot.x, rot.y, rot.z));
    // ballGroup.rotation.y -= deltaX / 50;

    // const transform = ball.userData.physicsBody.getCenterOfMassTransform();
    // let q = transform.getRotation();
    // console.log(q.x() + " " + q.y() + " " + q.z() + " " + q.w());

    // var euler = new THREE.Euler(generalGroup.rotation.x,generalGroup.rotation.y,generalGroup.rotation.z);
    // quat.setFromEuler(euler);
    // // quat.set(q.x(), q.y() - deltaX / 50, q.z(), 1);
    // transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    // ball.userData.physicsBody.setCenterOfMassTransform(transform);

    // for (const platform of platforms) {
    //     // const ms = platform.getMotionState();
    //     const transform = platform.getWorldTransform();
    //     let q = transform.getRotation();
    //     quat.set(1, q.x(), generalGroup.rotation.y, q.z());
    //     console.log(q.x() + " " + q.y() + " " + q.z() + " " + q.w());
    //     transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    //     platform.setWorldTransform(transform);
    // }

    return false;
});

// window.addEventListener( 'pointerdown', function ( event ) {

//     mouseCoords.set(
//         ( event.clientX / window.innerWidth ) * 2 - 1,
//         - ( event.clientY / window.innerHeight ) * 2 + 1
//     );
//     console.log(mouseCoords);

//     raycaster.setFromCamera( mouseCoords, camera );

//     // Creates a ball and throws it
//     const ballMass = 35;
//     const ballRadius = 0.4;

//     const ballMaterial = new THREE.MeshPhongMaterial({
//         color: 0x156289,
//         emissive: 0x091833,
//     });

//     const ball = new THREE.Mesh( new THREE.SphereGeometry( ballRadius, 14, 10 ), ballMaterial );
//     ballGroup.add(ball);
//     ball.castShadow = true;
//     ball.receiveShadow = true;
//     const ballShape = new Ammo.btSphereShape( ballRadius );
//     ballShape.setMargin( margin );
//     pos.copy( raycaster.ray.direction );
//     pos.add( raycaster.ray.origin );
//     quat.set( 0, 0, 0, 1 );
//     const ballBody = createRigidBody( ball, ballShape, ballMass, pos, quat );

//     pos.copy( raycaster.ray.direction );
//     pos.multiplyScalar( 24 );
//     ballBody.setLinearVelocity( new Ammo.btVector3( pos.x, pos.y, pos.z ) );

// } );

window.addEventListener( 'keydown', function ( event ) {

    console.log(ballBounds);

    switch ( event.keyCode ) {
        // D
        case 68:
            ball.position.y += 1;
            // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,1,0));
            break;
        // A
        case 65:
            ball.position.y -= 1;
            // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,-1,0));
            // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,0,0));
            break;
    }

} );

window.addEventListener( 'keyup', function () {

    // armMovement = 0;
    // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,0,0));
    console.log(cubeBounds);

} );