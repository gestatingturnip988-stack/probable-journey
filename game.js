// =========================================================================
// [SECTION 0: ERROR HANDLING & LOGGING]
// =========================================================================
function showMobileError(msg) {
    const logEl = document.getElementById('mobile-log');
    logEl.style.display = 'block';
    logEl.innerText += '[ERR] ' + msg + '\n';
}

window.onerror = function(msg, url, lineNo) {
    showMobileError(msg + " (line " + lineNo + ")");
    return false;
};

// =========================================================================
// [SECTION 1: UI STATE & SELECTION HANDLERS]
// =========================================================================
let playerGender = 'MALE';
let playerClass = 'BRAWLER';

function selectGender(g) {
    playerGender = g;
    document.getElementById('btn-g-m').classList.toggle('active', g === 'MALE');
    document.getElementById('btn-g-f').classList.toggle('active', g === 'FEMALE');
}

function selectClass(c) {
    playerClass = c;
    document.getElementById('btn-c-brawler').classList.toggle('active', c === 'BRAWLER');
    document.getElementById('btn-c-hunter').classList.toggle('active', c === 'HUNTER');
    document.getElementById('btn-c-mage').classList.toggle('active', c === 'MAGE');

    const desc = document.getElementById('class-desc');
    if (c === 'BRAWLER') desc.innerText = "Brawlers focus on raw power and close-range striking force.";
    else if (c === 'HUNTER') desc.innerText = "Hunters use bows at range and lay bear traps to immobilize foes.";
    else if (c === 'MAGE') desc.innerText = "Mages channel offensive elemental magic through staves and wands.";
}

function showCharacterCreation() {
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('creation-screen').style.display = 'flex';
}

function startGame() {
    document.getElementById('creation-screen').style.display = 'none';
    initGameEngine();
}

// =========================================================================
// [SECTION 2: ENGINE INIT & INVENTORY MANAGEMENT]
// =========================================================================
function initGameEngine() {
    const container = document.getElementById('canvas-container');
    let currentEnergy = 100;
    let currentHP = 100;
    const inventory = { wood: 0, stone: 0, meat: 0, hatchet: 0, knife: 0 };

    document.getElementById('ui-char-class').innerText = playerClass;
    document.getElementById('ui-char-gender').innerText = playerGender + ' Adventurer';

    let attackIcon = '👊';
    if (playerClass === 'HUNTER') attackIcon = '🏹';
    if (playerClass === 'MAGE') attackIcon = '🪄';
    document.getElementById('equip-weapon-icon').innerText = attackIcon;

    function updateUI() {
        document.getElementById('bar-energy').style.width = currentEnergy + '%';
        document.getElementById('bar-hp').style.width = currentHP + '%';
        document.getElementById('count-wood').innerText = inventory.wood;
        document.getElementById('count-stone').innerText = inventory.stone;
        document.getElementById('count-meat').innerText = inventory.meat;
        document.getElementById('count-hatchet').innerText = inventory.hatchet;
        document.getElementById('count-knife').innerText = inventory.knife;

        const invGrid = document.getElementById('inventory-grid');
        if (invGrid) {
            invGrid.innerHTML = '';
            const items = [
                { icon: '🪓', count: inventory.hatchet },
                { icon: '🔪', count: inventory.knife },
                { icon: '🪵', count: inventory.wood },
                { icon: '🪨', count: inventory.stone },
                { icon: '🥩', count: inventory.meat }
            ];
            items.forEach(item => {
                if (item.count > 0) {
                    const slot = document.createElement('div');
                    slot.className = 'inv-item-slot';
                    slot.innerHTML = `<span>${item.icon}</span><span class="qty">${item.count}</span>`;
                    invGrid.appendChild(slot);
                }
            });
        }
    }

    window.switchTab = function(tabName) {
        document.getElementById('tab-inv').style.display = (tabName === 'inv') ? 'block' : 'none';
        document.getElementById('tab-craft').style.display = (tabName === 'craft') ? 'block' : 'none';
        document.getElementById('tab-skills').style.display = (tabName === 'skills') ? 'block' : 'none';

        document.getElementById('tab-btn-inv').classList.toggle('active', tabName === 'inv');
        document.getElementById('tab-btn-craft').classList.toggle('active', tabName === 'craft');
        document.getElementById('tab-btn-skills').classList.toggle('active', tabName === 'skills');
    };

    // =========================================================================
    // [SECTION 3: THREE.JS SCENE, LIGHTING & TERRAIN]
    // =========================================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sunLight = new THREE.DirectionalLight(0xfffaed, 0.9);
    sunLight.position.set(30, 60, 20);
    scene.add(sunLight);

    // Terrain Function & Generation
    const WORLD_SIZE = 140;
    function getTerrainHeight(x, z) {
        if (z > 35) return -0.5;
        let height = 0;
        if (z > 20) {
            height = (35 - z) * 0.1;
        } else if (z < -30) {
            height = Math.abs(z + 30) * 0.6 + Math.sin(x * 0.2) * 4.0;
        } else {
            height = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 2.5 + 1.0;
        }
        return height;
    }

    const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 50, 50);
    groundGeo.rotateX(-Math.PI / 2);
    const pos = groundGeo.attributes.position;
    const colors = [];

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = getTerrainHeight(x, z);
        pos.setY(i, y);

        if (z > 20) {
            colors.push(0.9, 0.85, 0.55);
        } else if (z < -30) {
            colors.push(0.5, 0.5, 0.55);
        } else {
            colors.push(0.28, 0.52, 0.28);
        }
    }
    groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();

    const groundMesh = new THREE.Mesh(
        groundGeo, 
        new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true })
    );
    scene.add(groundMesh);

    // Ocean Water Plane
    const waterMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD_SIZE, 40),
        new THREE.MeshStandardMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.7 })
    );
    waterMesh.rotateX(-Math.PI / 2);
    waterMesh.position.set(0, -0.2, 45);
    scene.add(waterMesh);

    // =========================================================================
    // [SECTION 4: PLAYER ENTITY & TARGETING]
    // =========================================================================
    const playerGroup = new THREE.Group();
    const PLAYER_RADIUS = 0.5;

    const bodyColor = (playerGender === 'MALE') ? 0x2266cc : 0xcc22aa;
    const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.2, 0.5),
        new THREE.MeshStandardMaterial({ color: bodyColor, flatShading: true })
    );
    bodyMesh.position.y = 0.9;
    playerGroup.add(bodyMesh);

    const headMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xffcc99, flatShading: true })
    );
    headMesh.position.y = 1.75;
    playerGroup.add(headMesh);

    playerGroup.position.set(0, getTerrainHeight(0, 28), 28);
    scene.add(playerGroup);

    let playerVY = 0;
    let isGrounded = true;

    const targetRing = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1.0, 16),
        new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide })
    );
    targetRing.rotation.x = -Math.PI / 2;
    targetRing.visible = false;
    scene.add(targetRing);

    // =========================================================================
    // [SECTION 5: ENVIRONMENT & HARVESTABLES]
    // =========================================================================
    const boatGroup = new THREE.Group();
    const hull = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 1.2, 7.0),
        new THREE.MeshStandardMaterial({ color: 0x4a2e18, flatShading: true })
    );
    hull.rotation.z = 0.3;
    hull.rotation.y = 0.4;
    boatGroup.add(hull);
    boatGroup.position.set(6, getTerrainHeight(6, 30) + 0.4, 30);
    scene.add(boatGroup);

    let chestLooted = false;
    const chestMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xffaa00, flatShading: true })
    );
    chestMesh.position.set(3.5, getTerrainHeight(3.5, 28) + 0.4, 28);
    scene.add(chestMesh);

    const harvestables = [];
    const obstacleColliders = [];

    const chestData = { isChest: true, mesh: chestMesh, x: 3.5, z: 28, radius: 0.8 };
    harvestables.push(chestData);
    obstacleColliders.push(chestData);

    function spawnProp(type, x, z) {
        const g = new THREE.Group();
        let dropType = 'wood';
        let propRadius = 0.8;

        if (type === 'tree') {
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.4, 0.6, 3.5), 
                new THREE.MeshStandardMaterial({ color: 0x5a3d28, flatShading: true })
            );
            trunk.position.y = 1.75;
            const foliage = new THREE.Mesh(
                new THREE.ConeGeometry(2.2, 5.0, 6), 
                new THREE.MeshStandardMaterial({ color: 0x2e8b57, flatShading: true })
            );
            foliage.position.y = 5.0;
            g.add(trunk, foliage);
            dropType = 'wood';
            propRadius = 1.0;
        } else if (type === 'stone') {
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(1.2, 1), 
                new THREE.MeshStandardMaterial({ color: 0x778899, flatShading: true })
            );
            rock.position.y = 0.8;
            g.add(rock);
            dropType = 'stone';
            propRadius = 1.1;
        }

        const groundY = getTerrainHeight(x, z);
        g.position.set(x, groundY, z);
        scene.add(g);

        const itemData = { isCreature: false, mesh: g, dropType, hp: 3, x, z, radius: propRadius };
        harvestables.push(itemData);
        obstacleColliders.push(itemData);
    }

    for (let i = 0; i < 40; i++) {
        const rx = (Math.random() - 0.5) * 80;
        const rz = (Math.random() * -40) + 10;
        const r = Math.random();
        if (r < 0.6) spawnProp('tree', rx, rz);
        else spawnProp('stone', rx, rz);
    }

    // =========================================================================
    // [SECTION 6: AUTONOMOUS CREATURE SYSTEM]
    // =========================================================================
    const creatures = [];
    const projectiles = [];
    const traps = [];

    class AutonomousCreature {
        constructor(template) {
            this.isCreature = true;
            this.name = template.name;
            this.temperament = template.temperament;
            this.type = template.type;
            this.element = template.element;
            
            this.hp = template.hp;
            this.maxHp = template.hp;
            this.state = 'IDLE';

            this.radius = template.radius || 0.9;
            this.speed = template.speed || 2.5;

            this.x = template.x;
            this.z = template.z;

            this.targetX = this.x;
            this.targetZ = this.z;
            this.changeTargetTimer = 0;
            this.rootedTimer = 0;

            this.group = new THREE.Group();
            const cBody = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 0.9, 1.4),
                new THREE.MeshStandardMaterial({ color: template.color || 0xcc4444, flatShading: true })
            );
            cBody.position.y = 0.5;
            this.group.add(cBody);

            const gY = getTerrainHeight(this.x, this.z);
            this.group.position.set(this.x, gY, this.z);
            scene.add(this.group);

            this.mesh = this.group;
        }

        takeDamage(amt) {
            this.hp -= amt;
            if (this.hp <= (this.maxHp * 0.1)) this.state = 'SUBMITTED';
            else if (this.temperament !== 'DOCILE') this.state = 'HOSTILE';
            else this.state = 'FLEEING';
        }

        getConditionText() {
            if (this.state === 'SUBMITTED') return 'Condition: Submissive';
            const ratio = this.hp / this.maxHp;
            if (ratio > 0.7) return 'Condition: Healthy';
            if (ratio > 0.3) return 'Condition: Injured';
            return 'Condition: Critical';
        }

        update(delta, playerPos) {
            if (this.hp <= 0) return;

            if (this.rootedTimer > 0) {
                this.rootedTimer -= delta;
                return;
            }

            this.x = this.group.position.x;
            this.z = this.group.position.z;

            if (this.state === 'HOSTILE') {
                this.targetX = playerPos.x;
                this.targetZ = playerPos.z;
            } else if (this.state === 'FLEEING') {
                this.targetX = this.x + (this.x - playerPos.x);
                this.targetZ = this.z + (this.z - playerPos.z);
            } else if (this.state === 'IDLE') {
                this.changeTargetTimer -= delta;
                if (this.changeTargetTimer <= 0) {
                    this.targetX = this.x + (Math.random() - 0.5) * 20;
                    this.targetZ = this.z + (Math.random() - 0.5) * 20;
                    this.changeTargetTimer = 4 + Math.random() * 5;
                }
            }

            const dx = this.targetX - this.x;
            const dz = this.targetZ - this.z;
            const distToTarget = Math.hypot(dx, dz);

            if (distToTarget > 0.5 && this.state !== 'SUBMITTED') {
                const angle = Math.atan2(dx, dz);
                const moveX = this.x + Math.sin(angle) * this.speed * delta;
                const moveZ = this.z + Math.cos(angle) * this.speed * delta;

                let blocked = false;
                for (let obs of obstacleColliders) {
                    if (obs !== this && Math.hypot(moveX - obs.x, moveZ - obs.z) < (this.radius + obs.radius)) {
                        blocked = true;
                        this.changeTargetTimer = 0;
                        break;
                    }
                }

                if (!blocked) {
                    this.group.position.x = moveX;
                    this.group.position.z = moveZ;
                    this.group.rotation.y = angle;
                }
            }

            this.group.position.y = getTerrainHeight(this.group.position.x, this.group.position.z);
        }
    }

    const boar = new AutonomousCreature({ name: 'Forest Boar', temperament: 'WARY', type: 'STRIKING', element: 'EARTH', hp: 25, x: -10, z: -5 });
    const stag = new AutonomousCreature({ name: 'Meadow Stag', temperament: 'DOCILE', type: 'SPECIAL', element: 'WIND', hp: 15, x: 12, z: 0 });
    creatures.push(boar, stag);
    harvestables.push(boar, stag);
    obstacleColliders.push(boar, stag);

    // =========================================================================
    // [SECTION 7: COMBAT, SKILLS & INTERACTION]
    // =========================================================================
    const attackBtn = document.getElementById('btn-attack');
    const skillBtn = document.getElementById('btn-skill');

    function performPrimaryAttack() {
        if (playerClass === 'BRAWLER') {
            for (let h of harvestables) {
                if (Math.hypot(playerGroup.position.x - h.x, playerGroup.position.z - h.z) < 2.2) {
                    if (h.isCreature) h.takeDamage(8);
                    else h.hp--;
                    break;
                }
            }
        } else if (playerClass === 'HUNTER' || playerClass === 'MAGE') {
            const pGeo = (playerClass === 'MAGE') ? new THREE.SphereGeometry(0.3) : new THREE.CylinderGeometry(0.05, 0.05, 0.8);
            const pMat = new THREE.MeshBasicMaterial({ color: (playerClass === 'MAGE') ? 0x00ffff : 0xffaa00 });
            const proj = new THREE.Mesh(pGeo, pMat);

            proj.position.copy(playerGroup.position);
            proj.position.y += 1.2;
            proj.rotation.y = playerGroup.rotation.y;
            scene.add(proj);

            projectiles.push({
                mesh: proj,
                dirX: Math.sin(playerGroup.rotation.y),
                dirZ: Math.cos(playerGroup.rotation.y),
                speed: 18.0,
                life: 1.5,
                damage: 6
            });
        }
    }

    function performClassSkill() {
        if (playerClass === 'HUNTER') {
            const trapMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.6, 0.6, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x333333 })
            );
            trapMesh.position.set(playerGroup.position.x, getTerrainHeight(playerGroup.position.x, playerGroup.position.z) + 0.05, playerGroup.position.z);
            scene.add(trapMesh);
            traps.push({ mesh: trapMesh, x: playerGroup.position.x, z: playerGroup.position.z });
        } else if (playerClass === 'MAGE') {
            const blast = new THREE.Mesh(
                new THREE.RingGeometry(0.5, 3.5, 16),
                new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide })
            );
            blast.rotation.x = -Math.PI / 2;
            blast.position.set(playerGroup.position.x, getTerrainHeight(playerGroup.position.x, playerGroup.position.z) + 0.1, playerGroup.position.z);
            scene.add(blast);

            setTimeout(() => scene.remove(blast), 400);

            creatures.forEach(c => {
                if (Math.hypot(playerGroup.position.x - c.x, playerGroup.position.z - c.z) < 3.8) {
                    c.takeDamage(12);
                }
            });
        }
    }

    attackBtn.onclick = performPrimaryAttack;
    skillBtn.onclick = performClassSkill;

    document.getElementById('btn-interact').onclick = () => {
        if (!chestLooted && Math.hypot(playerGroup.position.x - chestData.x, playerGroup.position.z - chestData.z) < 2.5) {
            chestLooted = true;
            inventory.hatchet += 1;
            inventory.knife += 1;
            updateUI();
            scene.remove(chestMesh);
        }
    };

    document.getElementById('btn-jump').onclick = () => {
        if (isGrounded) { playerVY = 0.24; isGrounded = false; }
    };

    // =========================================================================
    // [SECTION 8: JOYSTICK CONTROL SYSTEM]
    // =========================================================================
    let joystickVector = { x: 0, y: 0 };
    const baseEl = document.getElementById('joystick-base');
    const knobEl = document.getElementById('joystick-knob');

    function handleJoystick(e) {
        const rect = baseEl.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        let dx = touch.clientX - (rect.left + rect.width / 2);
        let dy = touch.clientY - (rect.top + rect.height / 2);
        const dist = Math.hypot(dx, dy);
        const maxR = 40;

        if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
        knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        joystickVector = dist < 5 ? { x: 0, y: 0 } : { x: dx / maxR, y: dy / maxR };
    }

    function resetJoystick() {
        knobEl.style.transform = `translate(-50%, -50%)`;
        joystickVector = { x: 0, y: 0 };
    }

    baseEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); baseEl.setPointerCapture(e.pointerId); handleJoystick(e); });
    baseEl.addEventListener('pointermove', (e) => { if (baseEl.hasPointerCapture(e.pointerId)) handleJoystick(e); });
    baseEl.addEventListener('pointerup', (e) => { baseEl.releasePointerCapture(e.pointerId); resetJoystick(); });

    // =========================================================================
    // [SECTION 9: CAMERA SYSTEM (SWIPE & LOCK)]
    // =========================================================================
    let cameraAngle = 0;
    let isCameraLocked = true;
    let isSwipingCamera = false;
    let lastTouchX = 0;

    const camModeBtn = document.getElementById('btn-cam-mode');
    camModeBtn.onclick = () => {
        isCameraLocked = !isCameraLocked;
        camModeBtn.innerText = isCameraLocked ? '🔒 CAM: LOCKED' : '🔓 CAM: FREE';
        camModeBtn.style.color = isCameraLocked ? '#34d399' : '#fbbf24';
    };

    // Touch/Pointer Swipe Listener
    window.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || e.target.closest('#menu-modal') || e.target.closest('#joystick-base')) return;
        if (!isCameraLocked) {
            isSwipingCamera = true;
            lastTouchX = e.clientX;
        }
    });

    window.addEventListener('pointermove', (e) => {
        if (isSwipingCamera && !isCameraLocked) {
            const deltaX = e.clientX - lastTouchX;
            cameraAngle -= deltaX * 0.005;
            lastTouchX = e.clientX;
        }
    });

    window.addEventListener('pointerup', () => { isSwipingCamera = false; });
    window.addEventListener('pointercancel', () => { isSwipingCamera = false; });

    // Modal Handlers
    const menuModal = document.getElementById('menu-modal');
    document.getElementById('btn-menu-open').onclick = () => { updateUI(); menuModal.style.display = 'flex'; };
    document.getElementById('btn-menu-close').onclick = () => { menuModal.style.display = 'none'; };

    updateUI();

    function canMoveTo(nextX, nextZ) {
        const halfBoundary = (WORLD_SIZE / 2) - 1.5;
        if (Math.abs(nextX) > halfBoundary || Math.abs(nextZ) > halfBoundary) return false;

        for (let obj of obstacleColliders) {
            if (Math.hypot(nextX - obj.x, nextZ - obj.z) < (PLAYER_RADIUS + obj.radius)) return false;
        }
        return true;
    }

// =========================================================================
    // [SECTION 10: MAIN ANIMATION & GAME LOOP]
    // =========================================================================
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        const jx = joystickVector.x;
        const jy = joystickVector.y;

        if (Math.abs(jx) > 0.05 || Math.abs(jy) > 0.05) {
            const moveSpeed = 7.5;

            // Movement is ALWAYS calculated relative to the current camera angle.
            // This guarantees that pushing "Up" on the joystick always moves the 
            // character toward the top of your screen, regardless of where they are facing.
            const dx = (jx * Math.cos(cameraAngle) + jy * Math.sin(cameraAngle)) * moveSpeed * delta;
            const dz = (-jx * Math.sin(cameraAngle) + jy * Math.cos(cameraAngle)) * moveSpeed * delta;

            const nextX = playerGroup.position.x + dx;
            const nextZ = playerGroup.position.z + dz;

            if (canMoveTo(nextX, playerGroup.position.z)) playerGroup.position.x = nextX;
            if (canMoveTo(playerGroup.position.x, nextZ)) playerGroup.position.z = nextZ;

            // Character smoothly turns to face the direction they are actually moving
            playerGroup.rotation.y = Math.atan2(dx, dz);
        }

        const groundY = getTerrainHeight(playerGroup.position.x, playerGroup.position.z);
        if (isGrounded) {
            playerGroup.position.y = groundY;
        } else {
            playerGroup.position.y += playerVY;
            playerVY -= 0.8 * delta;
            if (playerGroup.position.y <= groundY) {
                playerGroup.position.y = groundY;
                playerVY = 0;
                isGrounded = true;
            }
        }

        creatures.forEach(c => c.update(delta, playerGroup.position));

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.life -= delta;
            p.mesh.position.x += p.dirX * p.speed * delta;
            p.mesh.position.z += p.dirZ * p.speed * delta;

            for (let c of creatures) {
                if (Math.hypot(p.mesh.position.x - c.x, p.mesh.position.z - c.z) < 1.2) {
                    c.takeDamage(p.damage);
                    p.life = 0;
                    break;
                }
            }

            if (p.life <= 0) {
                scene.remove(p.mesh);
                projectiles.splice(i, 1);
            }
        }

        for (let i = traps.length - 1; i >= 0; i--) {
            const t = traps[i];
            for (let c of creatures) {
                if (Math.hypot(t.x - c.x, t.z - c.z) < 1.0) {
                    c.rootedTimer = 4.0;
                    c.takeDamage(5);
                    scene.remove(t.mesh);
                    traps.splice(i, 1);
                    break;
                }
            }
        }

        let closest = null;
        let minDist = 3.5;
        harvestables.forEach(h => {
            const d = Math.hypot(playerGroup.position.x - h.x, playerGroup.position.z - h.z);
            if (d < minDist) { minDist = d; closest = h; }
        });

        const targetOverlay = document.getElementById('target-info-overlay');
        if (closest) {
            targetRing.position.set(closest.x, getTerrainHeight(closest.x, closest.z) + 0.1, closest.z);
            targetRing.visible = true;

            if (closest.isCreature) {
                targetOverlay.style.display = 'block';
                document.getElementById('target-name-lbl').innerText = closest.name;
                document.getElementById('target-status-lbl').innerText = closest.getConditionText();
            } else {
                targetOverlay.style.display = 'none';
            }
        } else {
            targetRing.visible = false;
            targetOverlay.style.display = 'none';
        }

        const aspect = window.innerWidth / window.innerHeight;
        const camDistance = aspect > 1.0 ? 5.5 : 7.0; 
        const camHeight = aspect > 1.0 ? 2.8 : 3.5;

        // Position camera behind player based on cameraAngle
        // If LOCKED: cameraAngle never changes.
        // If FREE: cameraAngle changes only when the user swipes the screen.
        camera.position.x = playerGroup.position.x + Math.sin(cameraAngle) * camDistance;
        camera.position.z = playerGroup.position.z + Math.cos(cameraAngle) * camDistance;
        camera.position.y = playerGroup.position.y + camHeight;
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1.2, playerGroup.position.z);

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
