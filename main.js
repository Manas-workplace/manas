import WindowManager from './WindowManager.js';

const t = THREE;
let camera, scene, renderer, world, particlesSystem;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let cubes = [];
let spheres = [];
let particles = [];
let sceneOffsetTarget = { x: 0, y: 0 };
let sceneOffset = { x: 0, y: 0 };

let raycaster, mouse;
let suctionTargets = [];
let particleEmitters = [];

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// Get time in seconds since the beginning of the day
function getTime() {
    return (new Date().getTime() - today) / 1000.0;
}

// Handle visibility changes
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

    function init() {
        initialized = true;

        setTimeout(() => {
            setupScene();
            setupWindowManager();
            resize();
            updateWindowShape(false);
            render();
            window.addEventListener('resize', resize);
            window.addEventListener('click', onMouseClick, false);
        }, 500);
    }

    function setupScene() {
        camera = new t.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
        camera.position.z = 1000;

        scene = new t.Scene();
        scene.background = new t.Color(0x000000);

        renderer = new t.WebGLRenderer({ antialias: true, depthBuffer: true });
        renderer.setPixelRatio(pixR);
        renderer.shadowMap.enabled = true;

        world = new t.Object3D();
        scene.add(world);

        let ambientLight = new t.AmbientLight(0x404040);
        scene.add(ambientLight);

        let pointLight = new t.PointLight(0xffffff, 2, 1000);
        pointLight.position.set(200, 200, 200);
        scene.add(pointLight);

        renderer.domElement.setAttribute("id", "scene");
        document.body.appendChild(renderer.domElement);

        raycaster = new t.Raycaster();
        mouse = new t.Vector2();
    }

    function onMouseClick(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);

        if (intersects.length > 0) {
            intersects[0].object.material.color.set(0xff0000); // Change to red
        }
    }

    function setupWindowManager() {
        windowManager = new WindowManager();
        windowManager.setWinShapeChangeCallback(updateWindowShape);
        windowManager.setWinChangeCallback(windowsUpdated);

        let metaData = { foo: "bar" };
        windowManager.init(metaData);

        windowsUpdated();
    }

    function windowsUpdated() {
        updateNumberOfCubes();
        createSpheres();
    }

    function updateNumberOfCubes() {
        let wins = windowManager.getWindows();

        cubes.forEach(c => world.remove(c));
        cubes = [];

        wins.forEach((win, i) => {
            let color = new t.Color();
            color.setHSL(i * 0.1, 1.0, 0.5);

            let size = 100 + i * 50;
            let cube = new t.Mesh(new t.BoxGeometry(size, size, size), new t.MeshBasicMaterial({ color: color, wireframe: true }));
            cube.position.x = win.shape.x + win.shape.w * 0.5;
            cube.position.y = win.shape.y + win.shape.h * 0.5;

            world.add(cube);
            cubes.push(cube);
        });
    }

    function createSpheres() {
        let numSpheres = 5;
        spheres.forEach(s => world.remove(s));
        spheres = [];
        suctionTargets = [];

        for (let i = 0; i < numSpheres; i++) {
            let geometry = new t.SphereGeometry(50, 32, 32);
            let material = new t.MeshPhongMaterial({ color: 0x00ff00, shininess: 100, transparent: true, opacity: 0.9 });
            let sphere = new t.Mesh(geometry, material);
            sphere.castShadow = true;
            sphere.receiveShadow = true;
            sphere.position.set(Math.random() * window.innerWidth, Math.random() * window.innerHeight, Math.random() * 100);

            world.add(sphere);
            spheres.push(sphere);
        }

        // Randomly select one sphere to be the suction target
        suctionTargets.push(spheres[Math.floor(Math.random() * spheres.length)]);
    }

    function animateSpheres() {
        spheres.forEach(sphere => {
            let wiggleIntensity = 0.05;
            sphere.position.x += Math.sin(internalTime) * wiggleIntensity;
            sphere.position.y += Math.cos(internalTime) * wiggleIntensity;
        });
    }

    function detectCollisions() {
        for (let i = 0; i < spheres.length - 1; i++) {
            for (let j = i + 1; j < spheres.length; j++) {
                let distance = spheres[i].position.distanceTo(spheres[j].position);
                if (distance < 100) {
                    triggerOozingEffect(spheres[i], spheres[j]);
                    if (suctionTargets.includes(spheres[i]) || suctionTargets.includes(spheres[j])) {
                        triggerSuctionEffect(spheres[i], spheres[j]);
                    }
                }
            }
        }
    }

    function triggerOozingEffect(sphere1, sphere2) {
        let scaleFactor = 1.1;
        sphere1.scale.set(scaleFactor, scaleFactor, scaleFactor);
        sphere2.scale.set(scaleFactor, scaleFactor, scaleFactor);

        setTimeout(() => {
            sphere1.scale.set(1, 1, 1);
            sphere2.scale.set(1, 1, 1);
        }, 500);

        // Particle emission effect
        emitParticles(sphere1.position);
        emitParticles(sphere2.position);
    }

    function triggerSuctionEffect(sphere1, sphere2) {
        let suctionSpeed = 0.05;
        if (sphere1.position.distanceTo(sphere2.position) > 10) {
            sphere2.position.lerp(sphere1.position, suctionSpeed);
        } else {
            // Absorb the sphere
            world.remove(sphere2);
            spheres.splice(spheres.indexOf(sphere2), 1);
            suctionTargets.splice(suctionTargets.indexOf(sphere2), 1);

            // Increase size of the absorbing sphere
            sphere1.scale.set(sphere1.scale.x * 1.2, sphere1.scale.y * 1.2, sphere1.scale.z * 1.2);

            // More particles upon absorption
            emitParticles(sphere1.position);
        }
    }

    function emitParticles(position) {
        let particleGeometry = new t.SphereGeometry(5, 16, 16);
        let particleMaterial = new t.MeshBasicMaterial({ color: 0xffff00 });
        for (let i = 0; i < 20; i++) {
            let particle = new t.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            particle.velocity = new t.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
            particles.push(particle);
            world.add(particle);
        }
    }

    function animateParticles() {
        particles.forEach((particle, index) => {
            particle.position.add(particle.velocity);
            particle.material.opacity -= 0.02; // Fade out particles

            if (particle.material.opacity <= 0) {
                world.remove(particle);
                particles.splice(index, 1); // Remove faded particles
            }
        });
    }

    function updateWindowShape(easing = true) {
        sceneOffsetTarget = { x: -window.screenX, y: -window.screenY };
        if (!easing) sceneOffset = sceneOffsetTarget;
