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

            // Decouple movement angle calculation from spinning locked camera loop
            const moveAngle = cameraAngle;
            
            const dx = (jx * Math.cos(moveAngle) + jy * Math.sin(moveAngle)) * moveSpeed * delta;
            const dz = (-jx * Math.sin(moveAngle) + jy * Math.cos(moveAngle)) * moveSpeed * delta;

            const nextX = playerGroup.position.x + dx;
            const nextZ = playerGroup.position.z + dz;

            if (canMoveTo(nextX, playerGroup.position.z)) playerGroup.position.x = nextX;
            if (canMoveTo(playerGroup.position.x, nextZ)) playerGroup.position.z = nextZ;

            // Rotate character toward movement vector
            const targetRotation = Math.atan2(dx, dz);
            
            if (isCameraLocked) {
                // Instantly align player facing direction
                playerGroup.rotation.y = targetRotation;
                // Sync camera view angle to match player facing direction
                cameraAngle = targetRotation;
            } else {
                // Free-cam: player turns to move, camera angle stays put
                playerGroup.rotation.y = targetRotation;
            }
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

        // Dynamic distance scaling based on Aspect Ratio
        const aspect = window.innerWidth / window.innerHeight;
        const camDistance = aspect > 1.0 ? 5.5 : 7.0; 
        const camHeight = aspect > 1.0 ? 2.8 : 3.5;

        // Position camera behind player based on cameraAngle
        camera.position.x = playerGroup.position.x + Math.sin(cameraAngle) * camDistance;
        camera.position.z = playerGroup.position.z + Math.cos(cameraAngle) * camDistance;
        camera.position.y = playerGroup.position.y + camHeight;
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1.2, playerGroup.position.z);

        renderer.render(scene, camera);
    }

    animate();

    // Responsive Canvas Resize Listener
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
