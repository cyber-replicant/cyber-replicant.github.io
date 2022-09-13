import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const twoPi = Math.PI * 2;

let camera, clock, scene, renderer, generalGroup, ballGroup, ball, bloop, ballBounds;
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
    camera.position.y = 15;
    camera.position.x = 4;
    camera.position.z = 20;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // const orbit = new OrbitControls(camera, renderer.domElement);
    // orbit.enableZoom = false;

    setupLights(scene);
    setupPhysics();

    setupLevel(scene);

    camera.lookAt(ball.position);

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

    // Middle cylinder object
    const middleCylinderRadius = 3;
    const middleCylinderHeight = 200;

    const data = {
        radiusTop: middleCylinderRadius,
        radiusBottom: middleCylinderRadius,
        height: middleCylinderHeight,
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
        data.thetaLength
    );

    const meshMaterial = new THREE.MeshPhongMaterial({
        color: 0x711C91,
        emissive: 0x380034,
        side: THREE.DoubleSide
    });

    let cylinderObject = new THREE.Mesh(cylinderGeometry, meshMaterial);

    cylinderObject.position.y = -20;
    generalGroup.add(cylinderObject);


    scene.add(generalGroup);

    // Platforms
    setupPlatforms(scene);

    // Ball
    setupBall(scene);
}

function setupPlatforms(scene) {

    const numPlatforms = 10;
    const gapSize = -11;

    for (let i = 0; i < numPlatforms; i++) {

        generatePlatform(i * gapSize);
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

    const rotations = [
        // 0,
        chunkSize * 1.5,
        chunkSize * 8.5,
        chunkSize * 2.5,
        chunkSize * 7.5,
        chunkSize * 3.5,
        chunkSize * 4.5,
        chunkSize * 5.5,
        chunkSize * 6.5,
    ];

    const positions = [
        new THREE.Vector3(5, 5, 0),
        new THREE.Vector3(5, 5, 5),
        new THREE.Vector3(5, 5, -5),
        new THREE.Vector3(0, 5, 5),
        new THREE.Vector3(0, 5, -5),
        new THREE.Vector3(-5, 5, -5),
        new THREE.Vector3(-5, 5, 0),
        new THREE.Vector3(-5, 5, 5),
    ];

    const maxChunksToRemove = 4;
    let chunksToRemove = getRandomInt(3, 5);

    while (chunksToRemove > 0) {

        let randomIndex = getRandomInt(0,  positions.length);

        // Never remove the first piece when on the first platform
        if (randomIndex === 0 && platformY === 0) {
            continue;
        }

        positions.splice(randomIndex, 1);
        rotations.splice(randomIndex, 1);
        chunksToRemove -= 1;
    }

    // for (let rotationY of rotations) {
    for (let i = 0, il = positions.length; i < il; i++) {
    // for (let position of positions) {

        let position = positions[i];
        let rotationY = rotations[i];

        let chunk = generatePieChunk(rotationY, platformY);
        // generalGroup.add(chunk);

        let sx = 3;
        let sy = 1;
        let sz = 3;
        let material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });

        let object = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1 ), material);
        // const shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5 ));
        // shape.setMargin(margin);

        object.geometry.computeBoundingBox();
        object.position.set(position.x, platformY, position.z);

        generalGroup.add(object);

        // boop = createParalellepipedWithPhysics(
        //     5, 1, 5, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFFFFF } )
        // );
        let cubeBounds = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        cubeBounds.setFromObject(object);
        // object.rotation.y = Math.PI / 2;

        object.userData.cubeBounds = cubeBounds;
        platforms.push(object);
    }
}

function generatePieChunk(rotationY, platformY) {

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
    object.position.y = platformY;
    return object;

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
    mesh.position.copy(position);
    // mesh.position.z = object.position.z;
    // mesh.position.set(new THREE.Vector3(0,0,0));
    mesh.rotation.x = Math.PI / 2;

    // geometry.computeBoundingBox();
    // console.log(geometry.boundingBox);
    // mesh.rotation.y = rotationY;
    // mesh.quaternion.y = Math.PI / 2;
    // mesh.rotateOnAxis( new THREE.Vector3( 0, 1, 0 ), rotationY );
    // console.log(mesh.quaternion);
    generalGroup.add(mesh);

    let cubeBounds = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    cubeBounds.setFromObject(mesh);
    mesh.userData.cubeBounds = cubeBounds;

    // const triangleMesh = new Ammo.btTriangleMesh();
    // const numTriangles = collisionPoints.length / 3 / 3;

    // for (let i = 0; i < numTriangles; i++) {

    //     let pointOne = new Ammo.btVector3(collisionPoints[i], collisionPoints[i+1], collisionPoints[i+2]);
    //     let pointTwo = new Ammo.btVector3(collisionPoints[i+3], collisionPoints[i+4], collisionPoints[i+5]);
    //     let pointThree = new Ammo.btVector3(collisionPoints[i+6], collisionPoints[i+7], collisionPoints[i+8]);

    //     triangleMesh.addTriangle(pointOne, pointTwo, pointThree);
    // }

    // const shape = new Ammo.btBvhTriangleMeshShape(triangleMesh, true, true);
    // shape.setMargin(margin);

    // pos.set(object.position.x, object.position.y, object.position.z);

    platforms.push(mesh);
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

    pos.set(0, 10, 5);
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

    for (const platform of platforms) {
        const cubeBounds = platform.userData.cubeBounds;
        cubeBounds.copy(platform.geometry.boundingBox).applyMatrix4(platform.matrixWorld);

        if (ballBounds.intersectsBox(cubeBounds)) {
            // ball.material.opacity = 0.1;
            ball.userData.physicsBody.setLinearVelocity(new Ammo.btVector3(0,15,0));
            // console.log("SDFSDF");
        }
    }
}

function animate() {

    ballBounds.copy(ball.geometry.boundingSphere).applyMatrix4(ball.matrixWorld);

    // const MEOW = 10;

    // if (camera.position.y - ball.position.y >= MEOW) {
    //     camera.position.y -= 1;
    //     // camera.lookAt(ball.position);
    // }

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
    physicsWorld.stepSimulation(deltaTime * 2, 10);

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
            // camera.position.y = p.y();
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

window.addEventListener( 'keydown', function ( event ) {

    // console.log(ballBounds);

    switch ( event.keyCode ) {
        // D
        case 68:
            camera.position.y += 1;
            // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,1,0));
            break;
        // A
        case 65:
            camera.position.y -= 1;
            // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,-1,0));
            // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,0,0));
            break;
    }

} );

window.addEventListener( 'keyup', function () {

    console.log(camera.position.y - ball.position.y);
    // armMovement = 0;
    // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,0,0));
    // console.log(cubeBounds);

} );