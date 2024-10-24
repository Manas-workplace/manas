import WindowManager from './WindowManager.js';

const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let cubes = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

let raycaster, mouse, animationSpeed = 0.01; // Added animationSpeed to control rotation speed

// Get time in seconds since the beginning of the day
function getTime () {
    return (new Date().getTime() - today) / 1000.0;
}

if (new URLSearchParams(window.location.search).get("clear")) {
    localStorage.clear();
} else {    
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== 'hidden' && !initialized) {
            init();
        }
    });

    window.onload = () => {
        if (document.visibilityState !== 'hidden') {
            init();
        }
    };

    function init () {
        initialized = true;

        setTimeout(() => {
            setupScene();
            setupWindowManager();
            resize();
            updateWindowShape(false);
            render();
            window.addEventListener('resize', resize);

            // Add event listener for mouse clicks
            window.addEventListener('click', onMouseClick, false);
        }, 500);    
    }

    function setupScene () {
        camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
        camera.position.z = 2.5;
        near = camera.position.z - .5;
        far = camera.position.z + 0.5;

        scene = new t.Scene();
        scene.background = new t.Color(0.0);
        scene.add(camera);

        renderer = new t.WebGLRenderer({antialias: true, depthBuffer: true});
        renderer.setPixelRatio(pixR);
        world = new t.Object3D();
        scene.add(world);

        renderer.domElement.setAttribute("id", "scene");
        document.body.appendChild(renderer.domElement);

        // Initialize raycaster and mouse for interaction
        raycaster = new t.Raycaster();
        mouse = new t.Vector2();
    }

    function onMouseClick(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(scene.children);

        if (intersects.length > 0) {
            // Change the color of the object and increase its rotation speed
            intersects[0].object.material.color.set(0xff0000);
            animationSpeed = 0.05; // Increase speed on click
        }
    }

    function setupWindowManager () {
        windowManager = new WindowManager();
        windowManager.setWinShapeChangeCallback(updateWindowShape);
        windowManager.setWinChangeCallback(windowsUpdated);

        let metaData = {foo: "bar"};

        windowManager.init(metaData);
        windowsUpdated();
    }

    function windowsUpdated () {
        updateNumberOfCubes();
    }

    function updateNumberOfCubes () {
        let wins = windowManager.getWindows();

        cubes.forEach((c) => {
            world.remove(c);
        });

        cubes = [];

        for (let i = 0; i < wins.length; i++) {
            let win = wins[i];

            let c = new t.Color();
            c.setHSL(i * .1, 1.0, .5);

            let s = 100 + i * 50;
            let cube = new t.Mesh(new t.BoxGeometry(s, s, s), new t.MeshBasicMaterial({color: c , wireframe: true}));
            cube.position.x = win.shape.x + (win.shape.w * .5);
            cube.position.y = win.shape.y + (win.shape.h * .5);

            world.add(cube);
            cubes.push(cube);
        }
    }

    function updateWindowShape (easing = true) {
        sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
        if (!easing) sceneOffset = sceneOffsetTarget;
    }

    function render () {
        let t = getTime();
        windowManager.update();

        let falloff = .05;
        sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
        sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

        world.position.x = sceneOffset.x;
        world.position.y = sceneOffset.y;

        let wins = windowManager.getWindows();

        for (let i = 0; i < cubes.length; i++) {
            let cube = cubes[i];
            let win = wins[i];
            let _t = t;

            let posTarget = {x: win.shape.x + (win.shape.w * .5), y: win.shape.y + (win.shape.h * .5)};

            cube.position.x = cube.position.x + (posTarget.x - cube.position.x) * falloff;
            cube.position.y = cube.position.y + (posTarget.y - cube.position.y) * falloff;
            cube.rotation.x += animationSpeed; // Apply animation speed to rotation
            cube.rotation.y += animationSpeed;
        }

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    function resize () {
        let width = window.innerWidth;
        let height = window.innerHeight;

        camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
}
