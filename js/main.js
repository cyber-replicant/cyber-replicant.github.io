/*
* Helix Jump-like code audition
*/

const twoPi = Math.PI * 2;


// THREE main components
let camera, clock, scene, renderer;

// THREE groups
let generalGroup, platformGroup, ballGroup;

// THREE objects
let base, baseBounds, ball, ballBounds, ballBody;
let skybox;


// Ammo.js Physics variables
let physicsWorld, transform;

const gravityConstant = 20;
const collisionMargin = 0.05;
const rigidBodies = [];


// Game settings
const chunkSize = twoPi / 8;
const platformGapSize = 12;

const ballMass = 50;
const bounceVelocity = 12;
const musicVolume = 0.3;

const cameraYDistanceFromBall = 5;

let level = 1;
let numPlatforms = 20;
let numDestroyChunksToSpawn = 2;
let numDoubleComboChunksToSpawn = 3;

let totalScore = 0;
let previousComboScore = 0;
let comboScore = 0;
let scoreModifier = 1;

// The level at which the score was most recently reset
let lastScoreReset = 0;

let isGameOver = false;
let isPaused = true;

let pointerDown = false;
let mouseX = 0, mouseY = 0;
let updateScoreTimeout = null;

// List of Audio objects matching the combo score
let comboSounds = [];

// List of active platforms that can be collided with
let platforms = [];
// List of platforms that can no longer be collided with, but are still busy animating
let breakingPlatforms = [];

// Audio
let musicAudio, gameOverAudio, gameWinAudio, doubleComboAudio, bounceAudio, bounceSameColorAudio, bounceHighVelocityAudio;

// UI
let uiComboScore, uiScoreModifier, ui

const useOrbitControls = false;

// A dictionary of Material objects to use whenever the ball changes color
const ballMaterialCache = {};

const platformColors = [
    // maroon
    {
        "color": 0x890D18,
        "emissive": 0x5B0B11,
    },
    // purple
    {
        "color": 0x3F0538,
        "emissive": 0x260322,
    },
    // orange
    // {
    //     "color": 0xC9300C,
    //     "emissive": 0x912108,
    // },
    // yellow
    {
        "color": 0xFFB638,
        "emissive": 0x685417,
    },
];

const destroyColor = {
    "color": 0x000000,
    "emissive": 0x01110c,
};

const doubleComboColor = {
    "color": 0xffffff,
    "emissive": 0xB76C8C,
};

let ballColor = platformColors[0].color;


// ----------------------------------------------------------------------------------------------------------------
// Entry point
// ----------------------------------------------------------------------------------------------------------------

Ammo().then(function(AmmoLib) {

    Ammo = AmmoLib;

    setupScene();
    animate();
});

function startGame(event) {

    event.preventDefault();

    document.getElementById("uiLevelContainer").style.display = "none";
    isPaused = false;
    musicAudio.play();

    return false;
}


// ----------------------------------------------------------------------------------------------------------------
// Game loop
// ----------------------------------------------------------------------------------------------------------------

function animate() {

    ballBounds.copy(ball.geometry.boundingSphere).applyMatrix4(ball.matrixWorld);

    render();
    requestAnimationFrame(animate);
}

function render() {

    const deltaTime = clock.getDelta();

    // Follow the ball, but avoid following for the upward bounces
    if (camera.position.y - cameraYDistanceFromBall > ball.position.y) {
        camera.position.y = ball.position.y + cameraYDistanceFromBall;
    }

    // Every time the combo score increases, play the next sound
    comboScore = 1 + Math.floor((lastScoreReset - ball.position.y) / platformGapSize);

    if (previousComboScore !== comboScore) {
        previousComboScore = comboScore;
        let soundIndex = comboScore - 1;

        if (comboScore > 0 && soundIndex < comboSounds.length) {
            playComboSound(soundIndex);
        }
    }

    // Update the UI
    uiComboScore.innerHTML = comboScore;
    uiTotalScore.innerHTML = totalScore;
    uiScoreModifier.innerHTML = "x" + scoreModifier;

    if (scoreModifier > 1) {
        uiScoreModifier.style.display = "block";
    }
    else {
        uiScoreModifier.style.display = "none";
    }

    if (comboScore > 0) {
        uiComboScore.style.display = "block";
    }
    else {
        uiComboScore.style.display = "none";
    }

    // Check for collisions and update physics objects
    if (!isGameOver && !isPaused) {
        checkCollisions();
        updatePhysics(deltaTime);
    }

    // Animate platforms that are in the process of breaking
    for (let platform of breakingPlatforms) {

        let mesh = platform.userData.platformMesh;
        let sides = mesh.userData.sides;

        let opacityChange = deltaTime * 3;
        mesh.material.opacity -= opacityChange;
        sides.material.opacity -= opacityChange;

        mesh.position.x += 1;
        mesh.position.y -= 1;

        if (mesh.material.opacity <= 0) {

            mesh.visible = false;
            platformGroup.remove(mesh);
            let index = breakingPlatforms.indexOf(platform);
            breakingPlatforms.splice(index, 1);
        }
    }

    renderer.render(scene, camera);
}

function checkCollisions() {

    // Check collisions against all possible platforms
    for (const platform of platforms) {

        const cubeBounds = platform.userData.cubeBounds;
        cubeBounds.copy(platform.geometry.boundingBox).applyMatrix4(platform.matrixWorld);

        // Bounce the ball if it intersects with any of the bounding cubes
        if (ballBounds.intersectsBox(cubeBounds) && !platform.userData.isColliding) {
            platform.userData.isColliding = true;
            processPlatformCollision(platform);

        // If it was colliding before but isn't anymore, update the isColliding field
        } else if (platform.userData.isColliding) {
            platform.userData.isColliding = false;
        }
    }

    // Process collision with base of the pillar
    if (ballBounds.intersectsBox(baseBounds)) {

        finishCombo(base.position.y);

        // document.getElementById("uiScoreContainer").style.display = "none";
        document.getElementById("uiWinScore").innerHTML = "SCORE " + totalScore;
        document.getElementById("uiGameSuccess").style.display = "block";
        document.getElementById("nextLevelButton").href = "/?level=" + (level + 1) + "&lastColor=" + ballColor;

        isGameOver = true;
        gameWinAudio.play();
        musicAudio.fade(musicVolume, 0, 3000);
    }
}

function processPlatformCollision(platform) {

    const color = platform.userData.color;
    const velocity = ballBody.getLinearVelocity().y();
    let breakPlatform = true;

    // Prevents platforms from hopping the ball by side-swiping
    // if (ball.position.y <= platform.position.y) {
    //     return;
    // }

    const isHighVelocity = velocity <= -40;

    // Game over platform
    if (color === destroyColor.color) {
        finishCombo(platform.position.y);

        if (!isHighVelocity) {
            gameOverAudio.play();
            musicAudio.stop();
            ball.material = ballMaterialCache[color];
            ballBody.setLinearVelocity(new Ammo.btVector3(0, 2, 0));

            document.getElementById("uiLoseScore").innerHTML = "SCORE " + totalScore;
            document.getElementById("uiGameOver").style.display = "block";
            isGameOver = true;
            breakPlatform = false;
        } else {
            platform.userData.platformMesh.material = ball.material.clone();
            bounceHighVelocityAudio.play();
            ballBody.setLinearVelocity(new Ammo.btVector3(0, bounceVelocity, 0));
        }
    }
    // Bounce platforms
    else {
        if (color === doubleComboColor.color) {

            ballBody.setLinearVelocity(new Ammo.btVector3(0, bounceVelocity, 0));
            doubleComboAudio.play();
            scoreModifier += 1;
        }
        // If the color doesn't match
        else if (color !== ballColor) {

            if (color !== destroyColor.color) {
                ball.material = ballMaterialCache[color];
                ballColor = color;
            }

            finishCombo(platform.position.y);

            bounceAudio.play();
            ballBody.setLinearVelocity(new Ammo.btVector3(0, bounceVelocity, 0));
            // breakPlatform = false;
        }
        // If the color matches
        else {
            bounceSameColorAudio.play();
            ballBody.setLinearVelocity(new Ammo.btVector3(0, bounceVelocity, 0));
            // breakPlatform = false;
        }
    }

    // if (isHighVelocity) {
    //     for (let moo of platforms) {
    //         if (moo.position.y === platform.position.y) {
    //             destroyPlatform(moo);
    //         }
    //     }
    // }

    if (breakPlatform) {
        destroyPlatform(platform);
    }
}

// ----------------------------------------------------------------------------------------------------------------
// Helper functions
// ----------------------------------------------------------------------------------------------------------------

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomColor() {
    return Math.floor(Math.random() * ( 1 << 24 ));
}

function shuffleArray(array) {

  for (let i = array.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

function finishCombo(positionY) {

    // Update the UI scores when the combo finishes
    const scoreIncrease = comboScore * scoreModifier;
    totalScore += scoreIncrease;

    lastScoreReset = positionY;
    scoreModifier = 1;

    let scoreUpdate = document.getElementById("uiScoreUpdate");
    scoreUpdate.innerHTML = "+" + scoreIncrease;
    scoreUpdate.style.display = "block";

    if (updateScoreTimeout !== null) {
        clearTimeout(updateScoreTimeout);
    }

    updateScoreTimeout = setTimeout(() => {
        scoreUpdate.style.display = "none";
        updateScoreTimeout = null;
    }, 800);
}

function destroyPlatform(platform) {

    let index = platforms.indexOf(platform);
    platforms.splice(index, 1);

    let mesh = platform.userData.platformMesh;
    mesh.material.transparent = true;
    mesh.userData.sides.material.transparent = true;
    breakingPlatforms.push(platform);

    // const shape = new Ammo.btSphereShape(10);
    // const body = createRigidBody(mesh, shape, 10);
    // body.setLinearVelocity(new Ammo.btVector3(-4, -10, 0));

    // setTimeout(() => {
    //     physicsWorld.removeRigidBody(body);
    // }, 500);
}

function playComboSound(soundIndex) {

    let soundToPlay = null;

    for (let i = 0; i < comboSounds.length; i++) {

        const sound = comboSounds[i];

        if (soundIndex === i) {
            soundToPlay = sound;
        } else {
            sound.mute();
        }
    }

    if (soundToPlay === null) {
        soundToPlay = comboSounds[comboSounds.length - 1];
    }

    soundToPlay.play();
}


// ----------------------------------------------------------------------------------------------------------------
// Input / event handling
// ----------------------------------------------------------------------------------------------------------------

window.addEventListener('resize', function() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

}, false);


// window.addEventListener("mousedown", function(event) {
window.addEventListener("pointerdown", function(event) {

    if (isGameOver || isPaused) {
        return;
    }

    event.preventDefault();

    pointerDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;

    return false;
});

// window.addEventListener("mouseup", function(event) {
window.addEventListener("pointerup", function(event) {

    if (isGameOver || isPaused) {
        return;
    }

    event.preventDefault();
    pointerDown = false;
    return false;
});

// window.addEventListener("mousemove", function(event) {
window.addEventListener("pointermove", function(event) {

    if (!pointerDown || isGameOver || isPaused) {
        return;
    }

    console.log(event.target);
    if (event.target.hasPointerCapture !== undefined && event.target.hasPointerCapture(event.pointerId)) {
        event.target.releasePointerCapture(event.pointerId);
    }

    event.preventDefault();

    let deltaX = event.clientX - mouseX;
    mouseX = event.clientX;
    mouseY = event.clientY;

    platformGroup.rotation.y += deltaX / 20;
    // console.log(mouseX + " " + mouseY);

    return false;
});

// window.addEventListener("touchmove", function(event) {

//     // This isn't a fun browser!
//     // if ( ! rotation) {
//     //      rotation = Math.atan2(event.touches[0].pageX - event.touches[1].pageX,
//     //            event.touches[0].pageX - event.touches[1].pageX) * 180 / Math.PI;
//     // }

//     let rotation = event.touches[0].pageX - event.touches[1].pageX;
//     console.log(rotation);
//     platformGroup.rotation.y += rotation;

//     // Take into account vendor prefixes, which I haven't done.
//     // this.style.transform = "rotate(" + rotation + "deg)":
// });


// ----------------------------------------------------------------------------------------------------------------
// Physics handling
// ----------------------------------------------------------------------------------------------------------------

function updatePhysics(deltaTime) {

    // Step world
    physicsWorld.stepSimulation(deltaTime * 2, 10);

    // Update rigid bodies
    for (let i = 0, il = rigidBodies.length; i < il; i ++) {

        const objThree = rigidBodies[i];
        const objPhys = objThree.userData.physicsBody;
        const motion = objPhys.getMotionState();

        if (motion) {
            motion.getWorldTransform(transform);
            const p = transform.getOrigin();
            const q = transform.getRotation();
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }
    }
}

function createRigidBody(object, shape, mass) {

    const position = object.position;
    const quaternion = object.quaternion;

    const bodyTransform = new Ammo.btTransform();
    bodyTransform.setIdentity();
    bodyTransform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
    bodyTransform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
    const motionState = new Ammo.btDefaultMotionState(bodyTransform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);

    const info = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
    const body = new Ammo.btRigidBody(info);

    body.setFriction(0.5);
    object.userData.physicsBody = body;

    if (mass > 0) {
        rigidBodies.push(object);
        body.setActivationState(4); // Disable deactivation
    }

    physicsWorld.addRigidBody(body);
    return body;
}


// ----------------------------------------------------------------------------------------------------------------
// Scene setup
// ----------------------------------------------------------------------------------------------------------------

function setupPhysics() {

    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    const broadphase = new Ammo.btDbvtBroadphase();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, - gravityConstant, 0));

    transform = new Ammo.btTransform();
}

function setupScene() {

    // Parse query parameters
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has("level")) {
        level = parseInt(searchParams.get("level"));

        // Add 10 extra platforms per level
        numPlatforms += (level - 1) * 10;

        numDestroyChunksToSpawn *= level;
        numDoubleComboChunksToSpawn += level;

        let lastColor = searchParams.get("lastColor");

        for (const color of platformColors) {
            if (color.color === lastColor) {
                ballColor = lastColor;
                break;
            }
        }
    }

    document.getElementById("uiLevel").innerHTML = "LEVEL " + level;

    uiComboScore = document.getElementById("uiComboScore");
    uiTotalScore = document.getElementById("uiTotalScore");
    uiScoreModifier = document.getElementById("uiScoreModifier");

    // Setup THREE components
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x444444);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 30000);
    camera.position.y = 18;
    camera.position.x = 4;
    camera.position.z = 25;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // if (useOrbitControls) {
    //     const orbit = new OrbitControls(camera, renderer.domElement);
    // }

    setupLights(scene);
    setupPhysics();

    setupLevel(scene);
    setupAudio();

    camera.lookAt(ball.position);
    render();

    // Game is laggy if started too soon, let objects load first
    setTimeout(() => {

        document.getElementById("startButton").style.display = "block";
        document.getElementById("uiLoading").style.display = "none";
    }, 500);
}

function setupLights() {

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

function setupLevel() {

    generalGroup = new THREE.Group();
    platformGroup = new THREE.Group();
    ballGroup = new THREE.Group();

    scene.add(generalGroup);
    scene.add(platformGroup);
    scene.add(ballGroup);

    // Central pillar
    setupPillar();

    // Platforms
    setupPlatforms();

    // Ball
    setupBall();

    // Skybox
    setupSkybox();
}

function setupAudio() {

    comboSounds = [
        new Howl({ src: ['/static/audio/combo-01.wav'] }),
        new Howl({ src: ['/static/audio/combo-02.wav'] }),
        new Howl({ src: ['/static/audio/combo-03.wav'] }),
        new Howl({ src: ['/static/audio/combo-04.wav'] }),
        new Howl({ src: ['/static/audio/combo-05.wav'] }),
        new Howl({ src: ['/static/audio/combo-06.wav'] }),
        new Howl({ src: ['/static/audio/combo-07.wav'] }),
        new Howl({ src: ['/static/audio/combo-08.wav'] }),
        new Howl({ src: ['/static/audio/combo-09.wav'] }),
        new Howl({ src: ['/static/audio/combo-10.wav'] }),
        new Howl({ src: ['/static/audio/combo-11.wav'] }),
        new Howl({ src: ['/static/audio/combo-12.wav'] }),
        new Howl({ src: ['/static/audio/combo-13.wav'] }),
        new Howl({ src: ['/static/audio/combo-14.wav'] }),
        new Howl({ src: ['/static/audio/combo-15.wav'] }),
        new Howl({ src: ['/static/audio/combo-16.wav'] }),
        new Howl({ src: ['/static/audio/combo-17.wav'] }),
        new Howl({ src: ['/static/audio/combo-18.wav'] }),
        new Howl({ src: ['/static/audio/combo-19.wav'] }),
        new Howl({ src: ['/static/audio/combo-20.wav'] }),
        new Howl({ src: ['/static/audio/combo-21.wav'] }),
        new Howl({ src: ['/static/audio/combo-22.wav'] }),
    ];

    musicAudio = new Howl({
        src: ["/static/audio/music-01.wav"],
        loop: true
    });
    musicAudio.volume(musicVolume);

    gameOverAudio = new Howl({ src: ["/static/audio/gameOver.wav"], volume: 2.0 });
    gameWinAudio = new Howl({ src: ["/static/audio/gameWin.wav"] });
    doubleComboAudio = new Howl({ src: ["/static/audio/doubleCombo.wav"] });

    bounceAudio = new Howl({ src: ["/static/audio/bounce.wav"] });
    bounceSameColorAudio = new Howl({ src: ["/static/audio/bounceSameColor.wav"] });
    bounceHighVelocityAudio = new Howl({ src: ["/static/audio/bounceHighVelocity.wav"] });
}

function setupPillar() {

    // Middle pillar object
    const pillarGeometry = new THREE.CylinderGeometry(
        3, // radiusTop
        3, // radiusBottom
        2000, // height
        30, // radialSegments
        1, // heightSegments
        false, // openEnded
        0, // thetaStart
        twoPi // thetaLength
    );

    const pillarMaterial = new THREE.MeshPhongMaterial({
        color: 0x711C91,
        emissive: 0x380034,
        side: THREE.DoubleSide
    });

    let pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.y = -950;
    generalGroup.add(pillar);

    // Pillar base
    const baseRadius = 10;
    const baseHeight = 2;

    const baseGeometry = new THREE.CylinderGeometry(
        baseRadius, // radiusTop
        baseRadius, // radiusBottom
        baseHeight, // height
        30, // radialSegments
        1, // heightSegments
        false, // openEnded
        0, // thetaStart
        twoPi // thetaLength
    );

    // const baseMaterial = new THREE.MeshPhongMaterial({
    //     color: 0xB80D57,
    //     emissive: 0x720935,
    //     side: THREE.DoubleSide
    // });

    base = new THREE.Mesh(baseGeometry, pillarMaterial);
    base.position.y = numPlatforms * -platformGapSize;
    generalGroup.add(base);

    // Create physics object for base to stop the ball
    const baseShape = new Ammo.btCylinderShape(new Ammo.btVector3(baseRadius, baseHeight * 0.5, 50));
    baseShape.setMargin(collisionMargin);
    const baseBody = createRigidBody(base, baseShape, 0);
    // baseBody.setFriction(0);

    // Create bounding box for the base so that we can detect the end game condition
    let boxMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    let boxGeometry = new THREE.BoxGeometry(20, 2, 20, 1, 1, 1 );
    let box = new THREE.Mesh(boxGeometry, boxMaterial);

    box.geometry.computeBoundingBox();
    box.position.copy(base.position);
    box.visible = false;
    generalGroup.add(box);

    // Generate the bounding box for the platform chunk
    baseBounds = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    baseBounds.setFromObject(box);
}

function setupSkybox() {

    const skyboxTexturePaths = [
        './static/skybox/skybox4.png', // right
        './static/skybox/skybox4.png', // left
        './static/skybox/skybox4.png',
        './static/skybox/skybox4.png', // bottom
        './static/skybox/skybox4.png',
        './static/skybox/skybox4.png', //back
    ];

    const materialArray = skyboxTexturePaths.map(image => {
        let texture = new THREE.TextureLoader().load(image);
        return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    });

    // let material = new THREE.MeshBasicMaterial({ color: getRandomColor() });
    let object = new THREE.Mesh(new THREE.BoxGeometry(10000, 10000, 10000, 1, 1, 1 ), materialArray);
    object.position.set(0, 0, 0);
    generalGroup.add(object);
}

function setupBall() {

    const ballRadius = 1;

    const ballGeometry = new THREE.SphereGeometry(
        ballRadius, // radius
        32, // widthSegments
        16, // heightSegments
        0, // phiStart
        twoPi, // phiLength
        0, // thetaStart
        Math.PI // thetaLength
    )

    for (let colorData of platformColors) {

        const ballMaterial = new THREE.MeshPhongMaterial({
            color: colorData.color,
            emissive: colorData.emissive,
            side: THREE.DoubleSide,
            // flatShading: true
        });

        ballMaterialCache[colorData.color] = ballMaterial;
    }

    ballMaterialCache[destroyColor.color] = new THREE.MeshPhongMaterial({
        color: destroyColor.color,
        emissive: destroyColor.emissive,
        side: THREE.DoubleSide,
        // flatShading: true
    });

    // Create THREE ball object
    ball = new THREE.Mesh(ballGeometry, ballMaterialCache[ballColor]);
    ball.castShadow = true;
    ball.position.set(0, 10, 5);

    ballGroup.add(ball);

    // Create ball bounding box
    ballBounds = new THREE.Sphere(ball.position, ballRadius);

    // Create ball physics object
    const ballShape = new Ammo.btSphereShape(ballRadius);
    ballShape.setMargin(collisionMargin);

    ballBody = createRigidBody(ball, ballShape, ballMass);
    // ballBody.setRestitution(1);
    ballBody.setLinearVelocity(new Ammo.btVector3(0, -10, 0));
}

function setupPlatforms() {

    let destroyChunks = {};
    let doubleComboChunks = {};

    // Calculate where to randomly place destroy chunks
    while (numDestroyChunksToSpawn > 0) {

        // Never spawn a destroy chunk in the top 3 platforms
        let platformIndex = getRandomInt(3,  numPlatforms - 1);

        if (platformIndex in destroyChunks) {
            continue;
        }

        destroyChunks[platformIndex] = true;
        numDestroyChunksToSpawn -= 1;
    }

    // Calculate where to randomly place destroy chunks
    while (numDoubleComboChunksToSpawn > 0) {

        // Never spawn a doulbe combo chunk in the top 5 platforms
        let platformIndex = getRandomInt(5,  numPlatforms - 1);

        if (platformIndex in doubleComboChunks) {
            continue;
        }

        doubleComboChunks[platformIndex] = true;
        numDoubleComboChunksToSpawn -= 1;
    }

    // Generate the chunks for each platform
    for (let i = 0; i < numPlatforms; i++) {

        let hasDestroyChunk = destroyChunks[i];
        let hasDoubleComboChunk = doubleComboChunks[i];
        generatePlatformsAtHeight(i * -platformGapSize, hasDestroyChunk, hasDoubleComboChunk);
    }
}

function generatePlatformsAtHeight(platformY, hasDestroyChunk, hasDoubleComboChunk) {

    // Rotations and positions of platform chunks
    const rotations = [
        chunkSize * 1.5,
        chunkSize * 2.5,
        chunkSize * 3.5,
        chunkSize * 4.5,
        chunkSize * 5.5,
        chunkSize * 6.5,
        chunkSize * 7.5,
        chunkSize * 8.5,
    ];

    const startPos = new THREE.Vector3(0, platformY, 5);

    const positions = [
        new THREE.Vector3(5, platformY, 0),
        new THREE.Vector3(5, platformY, -5),
        new THREE.Vector3(0, platformY, -5),
        new THREE.Vector3(-5, platformY, -5),
        new THREE.Vector3(-5, platformY, 0),
        new THREE.Vector3(-5, platformY, 5),
        new THREE.Vector3(0, platformY, 5),
        new THREE.Vector3(5, platformY, 5),
    ];

    // Remove a random amount of pie chunks from the platform
    let numChunksToRemove = getRandomInt(4, 6);

    while (numChunksToRemove > 0) {

        let randomIndex = getRandomInt(0,  positions.length - 1);

        // Never remove the first piece when on the first platform
        if (platformY === 0 && positions[randomIndex].equals(startPos)) {
            continue;
        }

        positions.splice(randomIndex, 1);
        rotations.splice(randomIndex, 1);
        numChunksToRemove -= 1;
    }

    // Generate array of chunk types
    let chunkColors = [];

    if (hasDestroyChunk) {
        chunkColors.push(destroyColor);
    }

    if (hasDoubleComboChunk) {
        chunkColors.push(doubleComboColor);
    }

    const numColorsToSelect = positions.length - chunkColors.length;
    const numColors = Object.keys(platformColors).length - 1;

    // [0, 1, 2, 3];

    for (let i = 0, il = positions.length - chunkColors.length; i < il; i++) {
        const colorIndex = getRandomInt(0, numColors);
        chunkColors.push(platformColors[colorIndex]);
    }

    shuffleArray(chunkColors);

    // Generate a platform chunk for each of the remaining positions
    for (let i = 0, il = positions.length; i < il; i++) {

        let colorData = chunkColors[i];
        generatePlatformChunk(rotations[i], positions[i], colorData);
    }
}

function generatePlatformChunk(rotationY, position, colorData) {

    // Generate the platform chunk by creating a cylinder
    const cylinderRadius = 9;
    const cylinderHeight = 2;

    const cylinderGeometry = new THREE.CylinderGeometry(
        cylinderRadius, // radiusTop
        cylinderRadius, // radiusBottom
        cylinderHeight, // height
        30, // radialSegments
        1, // heightSegments
        false, // openEnded
        0, // thetaStart
        chunkSize // thetaLength
    );

    const cylinderMaterial = new THREE.MeshPhongMaterial({
        color: colorData.color,
        emissive: colorData.emissive,
        side: THREE.DoubleSide,
    });

    // if (colorData.color === doubleComboColor.color) {
    //     cylinderMaterial.transparent = true;
    //     cylinderMaterial.opacity = 0.7;
    // }

    const chunk = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    platformGroup.add(chunk);

    chunk.castShadow = true;
    chunk.receiveShadow = true;

    chunk.rotation.y = rotationY;
    chunk.position.y = position.y;

    let boxMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    let boxGeometry = new THREE.BoxGeometry(2, 2, 2, 1, 1, 1 );
    let box = new THREE.Mesh(boxGeometry, boxMaterial);

    box.geometry.computeBoundingBox();
    box.position.copy(position);
    box.visible = false;

    box.userData.color = colorData.color;
    box.userData.isColliding = false;
    platformGroup.add(box);

    // let pointsMaterial = new THREE.PointsMaterial({
    //     color: colorData.color,
    //     size: 5,
    //     sizeAttenuation: false
    // });
    // let pointCloud = new THREE.Points(boxGeometry, pointsMaterial);
    // platformGroup.add(pointCloud);

    // Generate the bounding box for the platform chunk
    let cubeBounds = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    cubeBounds.setFromObject(box);
    box.userData.cubeBounds = cubeBounds;
    box.userData.platformMesh = chunk;

    platforms.push(box);

    // Draw shapes to fill the sides of the pie chunk
    const chunkLeftEnd = cylinderRadius - 2.6;

    const points = new Float32Array([
        0, -1, 0,
        chunkLeftEnd, -1, chunkLeftEnd,
        0, 1, 0,

        chunkLeftEnd, -1, chunkLeftEnd,
        0, 1, 0,
        chunkLeftEnd, 1, chunkLeftEnd,

        0, -1, 0,
        0, -1, cylinderRadius,
        0, 1, 0,

        0, -1, cylinderRadius,
        0, 1, 0,
        0, 1, cylinderRadius,
    ]);

    const sidesGeometry = new THREE.BufferGeometry();

    sidesGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const sidesMaterial = new THREE.MeshBasicMaterial({
        color: colorData["color"],
        side: THREE.DoubleSide
    });
    const sides = new THREE.Mesh(sidesGeometry, sidesMaterial);
    chunk.add(sides);
    chunk.userData.sides = sides;

    return chunk;
}
