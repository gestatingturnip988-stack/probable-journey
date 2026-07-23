function showMobileError(msg) {
    const logEl = document.getElementById('mobile-log');
    if (logEl) {
        logEl.style.display = 'block';
        logEl.innerText += '[ERR] ' + msg + '\n';
    }
}

window.onerror = function(msg, url, lineNo) {
    showMobileError(msg + " (line " + lineNo + ")");
    return false;
};

try {
    // --- Energy & Inventory Data ---
    const maxEnergy = 100;
    let currentEnergy = 100;
    const energyRegenRate = 12; // Energy regenerated per second

    const inventory = { wood: 0, stone: 0, berry: 0, shroom: 0 };

    function updateEnergyDisplay() {
        const bar = document.getElementById('bar-energy');
        if (bar) {
            const pct = Math.max(0, Math.min(100, (currentEnergy / maxEnergy) * 100));
            bar.style.width = pct + '%';
        }

        toggleButtonState('btn-action-1', currentEnergy >= 10);
        toggleButtonState('btn-action-2', currentEnergy >= 25);
        toggleButtonState('btn-action-3', currentEnergy >= 8);
    }

    function toggleButtonState(id, enabled) {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (enabled) btn.classList.remove('disabled');
        else btn.classList.add('disabled');
    }

    function consumeEnergy(amount) {
        if (currentEnergy >= amount) {
            currentEnergy -= amount;
            updateEnergyDisplay();
            return true;
        }
        return false;
    }

    function updateInventoryUI() {
        if (document.getElementById('count-wood')) document.getElementById('count-wood').innerText = inventory.wood;
        if (document.getElementById('count-stone')) document.getElementById('count-stone').innerText = inventory.stone;
        if (document.getElementById('count-berry')) document.getElementById('count-berry').innerText = inventory.berry;
        if (document.getElementById('count-shroom')) document.getElementById('count-shroom').innerText = inventory.shroom;

        const invGrid = document.getElementById('inventory-grid');
        if (!invGrid) return;
        invGrid.innerHTML = '';

        const items = [
            { icon: '🪵', name: 'Wood', count: inventory.wood },
            { icon: '🪨', name: 'Stone', count: inventory.stone },
            { icon: '🫐', name: 'Berry', count: inventory.berry },
            { icon: '🍄', name: 'Shroom', count: inventory.shroom }
        ];

        items.forEach(item => {
            if (item.count > 0) {
                const slot = document.createElement('div');
                slot.className = 'inv-item-slot';
                slot.innerHTML = `<span style="font-size:16px;">${item.icon}</span><span class="qty">${item.count}</span>`;
                invGrid.appendChild(slot);
            }
        });

        const totalSlots = 16;
        const currentCount = invGrid.children.length;
        for (let i = currentCount; i < totalSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-item-slot';
            slot.style.opacity = '0.3';
            invGrid.appendChild(slot);
        }
    }

    // Modal Tab Navigation
    window.switchTab = function(tabName) {
        const tabs = ['inv', 'skills', 'quests', 'options', 'journal'];
        tabs.forEach((t, index) => {
            const content = document.getElementById(`tab-${t}`);
            if (content) content.style.display = (t === tabName) ? 'block' : 'none';
            const btn = document.querySelectorAll('.tab-btn')[index];
            if (btn) {
                if (t === tabName) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });
    };

    // --- 3D Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a24);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    const WORLD_SIZE = 120;
    const HALF_WORLD = WORLD_SIZE / 2;

    scene.add(new THREE.GridHelper(WORLD_SIZE, 60, 0x00ffcc, 0x334433));
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
        new THREE.MeshStandardMaterial({ color: 0x182e18 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const playerRadius = 0.6;
    const playerGroup = new THREE.Group();

    const playerCube = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x3388ff })
    );
    playerCube.position.y = 0.6;
    playerGroup.add(playerCube);

    const playerPointer = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xff3333 })
    );
    playerPointer.position.set(0, 0.6, -0.7);
    playerGroup.add(playerPointer);

    scene.add(playerGroup);

    const harvestables = [];
    const enemies = [];
    const droppedItems = [];

    function createTree(x, z) {
        const group = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1), new THREE.MeshStandardMaterial({ color: 0x5c4033 }));
        trunk.position.y = 0.5;
        group.add(trunk);
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 6), new THREE.MeshStandardMaterial({ color: 0x2e8b57 }));
        leaves.position.y = 2.0;
        group.add(leaves);
        group.position.set(x, 0, z);
        scene.add(group);
        harvestables.push({ mesh: group, type: 'tree', dropType: 'wood', hp: 3, x: x, z: z, radius: 0.9 });
    }

    function createBoulder(x, z) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x777788, flatShading: true }));
        rock.position.set(x, 0.7, z);
        scene.add(rock);
        harvestables.push({ mesh: rock, type: 'boulder', dropType: 'stone', hp: 4, x: x, z: z, radius: 1.0 });
    }

    function createBush(x, z) {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), new THREE.MeshStandardMaterial({ color: 0x3a9d23, flatShading: true }));
        bush.position.set(x, 0.5, z);
        scene.add(bush);
        harvestables.push({ mesh: bush, type: 'bush', dropType: 'berry', hp: 2, x: x, z: z, radius: 0.7 });
    }

    function spawnDrop(x, z, itemType) {
        let color = 0x8b5a2b;
        if (itemType === 'stone') color = 0xaaaaaa;
        if (itemType === 'berry') color = 0xff0055;

        const dropMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: color }));
        dropMesh.position.set(x, 0.2, z);
        scene.add(dropMesh);
        droppedItems.push({ mesh: dropMesh, type: itemType, x: x, z: z });
    }

    function populateNodes() {
        for (let i = 0; i < 40; i++) {
            const x = (Math.random() - 0.5) * (WORLD_SIZE - 15);
            const z = (Math.random() - 0.5) * (WORLD_SIZE - 15);
            if (Math.hypot(x, z) < 6) continue;
            const r = Math.random();
            if (r < 0.5) createTree(x, z);
            else if (r < 0.8) createBoulder(x, z);
            else createBush(x, z);
        }
    }
    populateNodes();

    function checkCollisions(targetX, targetZ) {
        const boundaryLimit = HALF_WORLD - 1.0;
        if (Math.abs(targetX) > boundaryLimit || Math.abs(targetZ) > boundaryLimit) return true;
        for (let h of harvestables) {
            if (Math.hypot(targetX - h.x, targetZ - h.z) < (playerRadius + h.radius)) return true;
        }
        return false;
    }

    // --- Action Visual Arc FX ---
    function createSlashFX(range, color = 0x00ffcc) {
        const geometry = new THREE.RingGeometry(playerRadius + 0.2, playerRadius + range, 16, 1, 0, Math.PI * 0.75);
        const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const arc = new THREE.Mesh(geometry, material);
        arc.rotation.x = -Math.PI / 2;
        arc.position.y = 0.3;
        playerGroup.add(arc);

        let opacity = 0.8;
        const fadeInterval = setInterval(() => {
            opacity -= 0.15;
            material.opacity = opacity;
            if (opacity <= 0) {
                clearInterval(fadeInterval);
                playerGroup.remove(arc);
                geometry.dispose();
                material.dispose();
            }
        }, 30);
    }

    // --- Targeted Action Logic ---
    function triggerHit(rangeBonus, damageVal, targetCreaturesOnly = false, targetHarvestablesOnly = false) {
        const totalRange = playerRadius + rangeBonus;

        // 1. Noncreatures (Harvestables)
        if (!targetCreaturesOnly) {
            for (let i = harvestables.length - 1; i >= 0; i--) {
                const h = harvestables[i];
                const dist = Math.hypot(playerGroup.position.x - h.x, playerGroup.position.z - h.z);
                if (dist <= (playerRadius + h.radius + rangeBonus)) {
                    h.hp -= damageVal;
                    h.mesh.position.x += (Math.random() - 0.5) * 0.2;
                    if (h.hp <= 0) {
                        scene.remove(h.mesh);
                        spawnDrop(h.x, h.z, h.dropType);
                        harvestables.splice(i, 1);
                    }
                    return;
                }
            }
        }

        // 2. Enemies (Creatures)
        if (!targetHarvestablesOnly) {
            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                const dist = Math.hypot(playerGroup.position.x - e.x, playerGroup.position.z - e.z);
                if (dist <= (totalRange + e.radius)) {
                    e.hp -= damageVal;
                    if (e.hp <= 0) {
                        scene.remove(e.mesh);
                        enemies.splice(i, 1);
                    }
                    return;
                }
            }
        }
    }

    function performBasicAttack() {
        if (!consumeEnergy(10)) return;
        createSlashFX(1.8, 0x00ffcc);
        triggerHit(1.8, 1, false, false); // Targets ALL
    }

    function performPowerAttack() {
        if (!consumeEnergy(25)) return;
        createSlashFX(2.6, 0xff3300);
        triggerHit(2.6, 2.5, false, false); // Targets ALL
    }

    function performHarvest() {
        if (!consumeEnergy(8)) return;
        createSlashFX(1.5, 0xffaa00);
        triggerHit(1.5, 1, false, true); // Noncreatures ONLY
    }

    function bindActionPointer(id, handler) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            handler();
        });
    }

    bindActionPointer('btn-action-1', performBasicAttack);
    bindActionPointer('btn-action-2', performPowerAttack);
    bindActionPointer('btn-action-3', performHarvest);

    // --- Virtual Joystick System ---
    let joystickVector = { x: 0, y: 0 };
    const baseEl = document.getElementById('joystick-base');
    const knobEl = document.getElementById('joystick-knob');
    const maxRadius = 40;

    function handleJoystickMove(e) {
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const rect = baseEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
        }

        knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        if (dist < 6) joystickVector = { x: 0, y: 0 };
        else joystickVector = { x: dx / maxRadius, y: dy / maxRadius };
    }

    function resetJoystick() {
        knobEl.style.transform = `translate(-50%, -50%)`;
        joystickVector = { x: 0, y: 0 };
    }

    if (baseEl) {
        baseEl.addEventListener('pointerdown', (e) => {
            baseEl.setPointerCapture(e.pointerId);
            handleJoystickMove(e);
        });
        baseEl.addEventListener('pointermove', (e) => {
            if (baseEl.hasPointerCapture(e.pointerId)) handleJoystickMove(e);
        });
        baseEl.addEventListener('pointerup', (e) => {
            baseEl.releasePointerCapture(e.pointerId);
            resetJoystick();
        });
        baseEl.addEventListener('pointercancel', resetJoystick);
    }

    // --- Camera Controls ---
    let isAutoCam = false;
    const camModeBtn = document.getElementById('btn-cam-mode');
    if (camModeBtn) {
        camModeBtn.onclick = () => {
            isAutoCam = !isAutoCam;
            camModeBtn.innerText = isAutoCam ? '🎥 AUTO' : '🔒 FREE';
            camModeBtn.style.background = isAutoCam ? '#ffaa00' : 'rgba(0, 255, 204, 0.85)';
        };
    }

    let camRotInput = 0;
    function bindCamButton(id, val) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); camRotInput = val; });
        btn.addEventListener('pointerup', (e) => { e.preventDefault(); camRotInput = 0; });
        btn.addEventListener('pointerleave', () => { camRotInput = 0; });
    }
    bindCamButton('btn-cam-left', -1);
    bindCamButton('btn-cam-right', 1);

    // --- Modal Interface Controls ---
    const menuModal = document.getElementById('menu-modal');
    if (document.getElementById('btn-menu-open')) {
        document.getElementById('btn-menu-open').onclick = () => {
            updateInventoryUI();
            if (menuModal) menuModal.style.display = 'flex';
        };
    }
    if (document.getElementById('btn-menu-close')) {
        document.getElementById('btn-menu-close').onclick = () => {
            if (menuModal) menuModal.style.display = 'none';
        };
    }

    function updateDrops() {
        for (let i = droppedItems.length - 1; i >= 0; i--) {
            const item = droppedItems[i];
            const dist = Math.hypot(playerGroup.position.x - item.x, playerGroup.position.z - item.z);
            if (dist < 1.5) {
                inventory[item.type] = (inventory[item.type] || 0) + 1;
                updateInventoryUI();
                scene.remove(item.mesh);
                droppedItems.splice(i, 1);
            }
        }
    }

    updateInventoryUI();
    updateEnergyDisplay();

    // --- Main Game Loop ---
    const clock = new THREE.Clock();
    const moveSpeed = 8;
    const camRotateSpeed = 2.0;
    let cameraAngle = 0;
    const cameraDistance = 14;
    const cameraHeight = 10;

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const moveStep = moveSpeed * delta;
        const rotStep = camRotateSpeed * delta;

        if (currentEnergy < maxEnergy) {
            currentEnergy = Math.min(maxEnergy, currentEnergy + energyRegenRate * delta);
            updateEnergyDisplay();
        }

        if (camRotInput !== 0) cameraAngle += camRotInput * rotStep;

        const jx = joystickVector.x;
        const jy = joystickVector.y;

        if (Math.abs(jx) > 0.05 || Math.abs(jy) > 0.05) {
            const worldDx = (jx * Math.cos(cameraAngle) + jy * Math.sin(cameraAngle)) * moveStep;
            const worldDz = (-jx * Math.sin(cameraAngle) + jy * Math.cos(cameraAngle)) * moveStep;

            const nextX = playerGroup.position.x + worldDx;
            const nextZ = playerGroup.position.z + worldDz;

            if (!checkCollisions(nextX, playerGroup.position.z)) playerGroup.position.x = nextX;
            if (!checkCollisions(playerGroup.position.x, nextZ)) playerGroup.position.z = nextZ;

            const targetAngle = Math.atan2(worldDx, worldDz);
            playerGroup.rotation.y = targetAngle;

            if (isAutoCam && camRotInput === 0) {
                const desiredCamAngle = targetAngle + Math.PI;
                let angleDiff = desiredCamAngle - cameraAngle;
                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                cameraAngle += angleDiff * delta * 1.5;
            }
        }

        updateDrops();

        camera.position.x = playerGroup.position.x + Math.sin(cameraAngle) * cameraDistance;
        camera.position.z = playerGroup.position.z + Math.cos(cameraAngle) * cameraDistance;
        camera.position.y = playerGroup.position.y + cameraHeight;
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 0.6, playerGroup.position.z);

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

} catch (err) {
    showMobileError(err.message);
}
 
