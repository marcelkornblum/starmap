<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Galactic Map</title>
    <style>
        body { 
            margin: 0; 
            /* Solarized Dark: base03 */
            background-color: #002b36; 
            color: #839496; /* Solarized Dark: base0 */
            font-family: 'Inter', sans-serif; 
            overflow: hidden; 
        }
        canvas { display: block; }
        .ui-panel {
            position: absolute;
            /* Solarized Dark: base02 */
            background-color: rgba(7, 54, 66, 0.8);
            /* Solarized Dark: base01 */
            border: 1px solid #586e75;
            border-radius: 0.5rem;
            padding: 1rem;
            max-width: 300px;
            color: #93a1a1; /* Solarized Dark: base1 */
            backdrop-filter: blur(5px);
            z-index: 10;
        }
        #info-panel {
            top: 20px;
            left: 20px;
            display: none;
        }
        #info-panel h2 {
            margin-top: 0;
            font-size: 1.25rem;
            color: #eee8d5; /* Solarized Dark: base2 */
        }
        #loading-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            flex-direction: column;
            z-index: 10;
        }
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.2);
            /* Solarized Dark: blue */
            border-left-color: #268bd2;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
         #controls-container {
            bottom: 20px;
            right: 20px;
        }
        .control-group {
            margin-bottom: 1rem;
        }
        .control-group:last-child {
            margin-bottom: 0;
        }
        .control-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
            color: #93a1a1; /* Solarized Dark: base1 */
        }
        .control-group select, .control-group input, .control-group button {
            /* Solarized Dark: base01 */
            background-color: #586e75;
            /* Solarized Dark: base02 */
            border: 1px solid #073642;
            color: #eee8d5; /* Solarized Dark: base2 */
            border-radius: 0.25rem;
            padding: 0.5rem;
            width: 100%;
            box-sizing: border-box;
            cursor: pointer;
        }
        .control-group button:hover {
            background-color: #657b83; /* Solarized Dark: base00 */
        }
        #info-panel button {
             margin-top: 1rem;
        }
        #pin-grid-control {
            display: block;
        }
        #highlighted-stars-panel {
            bottom: 20px;
            left: 20px;
            display: none;
            max-height: 40vh;
            overflow-y: auto;
        }
        #highlighted-stars-panel h3 {
            margin-top: 0;
            color: #eee8d5; /* Solarized Dark: base2 */
        }
        #highlighted-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        #highlighted-list li a {
            display: block;
            padding: 0.5rem;
            color: #93a1a1; /* Solarized Dark: base1 */
            text-decoration: none;
            border-radius: 0.25rem;
        }
        #highlighted-list li a:hover {
            background-color: #586e75; /* Solarized Dark: base01 */
            color: #eee8d5; /* Solarized Dark: base2 */
        }
    </style>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body>
    <div id="loading-indicator">
        <div class="spinner"></div>
        <p>Loading stellar data...</p>
    </div>
    <div id="info-panel" class="ui-panel">
        <h2 id="star-name"></h2>
        <p><strong>Distance:</strong> <span id="star-distance"></span> light-years</p>
        <p><strong>Spectral Type:</strong> <span id="star-spec"></span></p>
        <p><strong>Absolute Magnitude:</strong> <span id="star-absmag"></span></p>
        <button id="highlight-star-button">Highlight Star</button>
    </div>
    <div id="controls-container" class="ui-panel">
        <div class="control-group">
            <label for="grid-toggle">Grid Style</label>
            <select id="grid-toggle">
                <option value="galactic">Galactic</option>
                <option value="radial" selected>Radial</option>
            </select>
        </div>
        <div class="control-group" id="pin-grid-control">
            <label for="pin-grid-checkbox">Pin Grid</label>
            <input type="checkbox" id="pin-grid-checkbox">
        </div>
        <div class="control-group">
            <label for="habitable-toggle">Highlight Habitable Candidates</label>
            <input type="checkbox" id="habitable-toggle">
        </div>
        <div class="control-group">
            <button id="reset-button">Reset View</button>
        </div>
    </div>
    <div id="highlighted-stars-panel" class="ui-panel">
        <h3>Highlighted Stars</h3>
        <ul id="highlighted-list"></ul>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    
    <script>
        // --- Basic Setup ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);

        // --- Controls ---
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 1;
        controls.maxDistance = 1000;

        camera.position.set(50, 50, 50);
        camera.lookAt(0,0,0);
        controls.saveState(); 


        // --- Grid Helpers ---
        const gridColor = 0x073642; // Solarized Dark: base02
        const gridHighlightColor = 0x268bd2; // Solarized Dark: blue
        const gridDivisions = 20;
        const gridSize = 200;

        const galacticGrid = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridHighlightColor);
        galacticGrid.visible = false;
        scene.add(galacticGrid);

        const radialLinesContainer = new THREE.Group();
        const radialArcsContainer = new THREE.Group();
        const radialLineMaterial = new THREE.LineBasicMaterial({ color: gridColor });
        const radialHighlightMaterial = new THREE.LineBasicMaterial({ color: gridHighlightColor });
        
        const radialLines = 6;
        const arcAngle = Math.PI / 2; 

        function createRadialPlane(planeType) {
            const linesGroup = new THREE.Group();
            const arcsGroup = new THREE.Group();
            
            const arcPoints = [];
            for (let i = 0; i <= 32; i++) {
                const angle = (i / 32) * arcAngle;
                if (planeType === 'xy') arcPoints.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
                if (planeType === 'xz') arcPoints.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
                if (planeType === 'yz') arcPoints.push(new THREE.Vector3(0, Math.cos(angle), Math.sin(angle)));
            }

            for (let i = 1; i <= gridDivisions / 2; i++) {
                const radius = i * (gridSize / gridDivisions);
                const scaledArcPoints = arcPoints.map(p => p.clone().multiplyScalar(radius));
                const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(scaledArcPoints), radialLineMaterial);
                arcsGroup.add(arc);
            }

            for (let i = 0; i < radialLines; i++) {
                const angle = (i / radialLines) * Math.PI;
                const material = (i === 0 || i === radialLines / 2) ? radialHighlightMaterial : radialLineMaterial;
                let p1, p2;
                if (planeType === 'xz') {
                    p1 = new THREE.Vector3(-Math.cos(angle) * (gridSize / 2), 0, -Math.sin(angle) * (gridSize / 2));
                    p2 = new THREE.Vector3(Math.cos(angle) * (gridSize / 2), 0, Math.sin(angle) * (gridSize / 2));
                } else if (planeType === 'xy') {
                    p1 = new THREE.Vector3(-Math.cos(angle) * (gridSize / 2), -Math.sin(angle) * (gridSize / 2), 0);
                    p2 = new THREE.Vector3(Math.cos(angle) * (gridSize / 2), Math.sin(angle) * (gridSize / 2), 0);
                } else { // yz
                    p1 = new THREE.Vector3(0, -Math.cos(angle) * (gridSize / 2), -Math.sin(angle) * (gridSize / 2));
                    p2 = new THREE.Vector3(0, Math.cos(angle) * (gridSize / 2), Math.sin(angle) * (gridSize / 2));
                }
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                linesGroup.add(new THREE.Line(lineGeometry, material));
            }
            return { lines: linesGroup, arcs: arcsGroup };
        }

        const planeXZ = createRadialPlane('xz');
        radialLinesContainer.add(planeXZ.lines);
        radialArcsContainer.add(planeXZ.arcs);

        const planeXY = createRadialPlane('xy');
        radialLinesContainer.add(planeXY.lines);
        radialArcsContainer.add(planeXY.arcs);

        const planeYZ = createRadialPlane('yz');
        radialLinesContainer.add(planeYZ.lines);
        radialArcsContainer.add(planeYZ.arcs);
        
        const axisMarkerGeometry = new THREE.SphereGeometry(2, 16, 16);
        // Solarized axis colors
        const xAxisMarker = new THREE.Mesh(axisMarkerGeometry, new THREE.MeshBasicMaterial({ color: 0xdc322f })); // Red
        const yAxisMarker = new THREE.Mesh(axisMarkerGeometry, new THREE.MeshBasicMaterial({ color: 0x859900 })); // Green
        const zAxisMarker = new THREE.Mesh(axisMarkerGeometry, new THREE.MeshBasicMaterial({ color: 0x268bd2 })); // Blue
        xAxisMarker.position.x = gridSize / 2;
        yAxisMarker.position.y = gridSize / 2;
        zAxisMarker.position.z = gridSize / 2;
        radialLinesContainer.add(xAxisMarker, yAxisMarker, zAxisMarker);

        radialLinesContainer.visible = true;
        radialArcsContainer.visible = true;
        scene.add(radialLinesContainer);
        scene.add(radialArcsContainer);


        // --- Lighting & Data ---
        scene.add(new THREE.AmbientLight(0x404040, 2));
        scene.add(new THREE.PointLight(0xffffff, 1.5, 2000));
        
        const loadingIndicator = document.getElementById('loading-indicator');
        const infoPanel = document.getElementById('info-panel');
        const starName = document.getElementById('star-name');
        const starDistance = document.getElementById('star-distance');
        const starSpec = document.getElementById('star-spec');
        const starAbsMag = document.getElementById('star-absmag');
        const habitableToggle = document.getElementById('habitable-toggle');
        const gridToggle = document.getElementById('grid-toggle');
        const pinGridControl = document.getElementById('pin-grid-control');
        const pinGridCheckbox = document.getElementById('pin-grid-checkbox');
        const resetButton = document.getElementById('reset-button');
        const highlightStarButton = document.getElementById('highlight-star-button');
        const highlightedStarsPanel = document.getElementById('highlighted-stars-panel');
        const highlightedList = document.getElementById('highlighted-list');

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let starGroups = []; 
        let originalColors = new Map();

        // --- Star Rendering ---
        function createStarMarker() {
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const context = canvas.getContext('2d');
            context.beginPath();
            context.moveTo(32, 5); context.lineTo(59, 32); context.lineTo(32, 59); context.lineTo(5, 32);
            context.closePath();
            context.strokeStyle = 'white';
            context.lineWidth = 4;
            context.stroke();
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture, sizeAttenuation: true });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(4, 4, 1);
            return sprite;
        }

        const dataUrl = 'https://www.datastro.eu/api/explore/v2.1/catalog/datasets/hyg-stellar-database/records?order_by=dist0&limit=100';
        fetch(dataUrl).then(r => r.json()).then(apiData => {
            loadingIndicator.style.display = 'none';
            const starPositions = [];

            apiData.results.forEach(d => {
                if (!d.x || !d.y || !d.z) return;
                const scaleFactor = 10;
                const x = d.x * scaleFactor, y = d.y * scaleFactor, z = d.z * scaleFactor;
                const distLy = d.dist0 * 3.26156;
                if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(distLy)) return;

                starPositions.push(x, y, z);

                const spec = d.spect ? d.spect.charAt(0).toUpperCase() : 'N';
                let color = 0xffffff;
                if ('OBAFGKM'.indexOf(spec) !== -1) {
                    const colors = {'O':0x9bb0ff,'B':0xaabfff,'A':0xcad7ff,'F':0xf8f7ff,'G':0xfff4ea,'K':0xffd2a1,'M':0xffa07a};
                    color = colors[spec];
                }

                const starGroup = new THREE.Group();
                starGroup.position.set(x, y, z);
                starGroup.userData = { id: d.id || `custom-${x}-${y}-${z}`, name: d.proper||d.gl||`HIP ${d.hip}`, dist: distLy.toFixed(2), spec: d.spect||'N/A', absmag: d.absmag.toFixed(2), isHabitableCandidate: 'GKM'.indexOf(spec)!==-1 && distLy < 50 };
                
                const marker = createStarMarker();
                marker.material.color.set(color);
                starGroup.add(marker);
                
                originalColors.set(starGroup, new THREE.Color(color));
                scene.add(starGroup);
                starGroups.push(starGroup);
            });

            // Create the central points object
            const pointsGeometry = new THREE.BufferGeometry();
            pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
            const pointsMaterial = new THREE.PointsMaterial({
                color: 0xb58900, // Solarized Yellow
                size: 0.5,
                sizeAttenuation: true
            });
            const starPoints = new THREE.Points(pointsGeometry, pointsMaterial);
            scene.add(starPoints);


            // Add Sol
            const solGroup = new THREE.Group();
            solGroup.position.set(0,0,0);
            solGroup.userData = { id: 'sol', name: 'Sol (Sun)', dist: '0.00', spec: 'G2V', absmag: '4.83', isHabitableCandidate: true };
            const solMarker = createStarMarker();
            solMarker.material.color.set(0xFFFDD0);
            solMarker.scale.set(6, 6, 1);
            solGroup.add(solMarker);
            originalColors.set(solGroup, new THREE.Color(0xFFFDD0));
            scene.add(solGroup);
            starGroups.push(solGroup);

            // Highlight Sol by default
            highlightedStars.push(solGroup);
            updateAllStarColors();
            updateHighlightedStarsPanel();

        }).catch(error => {
            console.error('Error loading star data:', error);
            loadingIndicator.innerText = 'Failed to load data.';
        });

        // --- Interactivity ---
        let selectedStarGroup = null;
        let highlightedStars = [];
        let isGridPinned = false;
        const gridOffsetQuaternion = new THREE.Quaternion();

        function updateHighlightedStarsPanel() {
            highlightedList.innerHTML = '';
            if (highlightedStars.length > 0) {
                highlightedStarsPanel.style.display = 'block';
                highlightedStars.forEach(group => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = '#';
                    a.textContent = group.userData.name;
                    a.dataset.starId = group.userData.id;
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        flyToStar(group);
                    });
                    li.appendChild(a);
                    highlightedList.appendChild(li);
                });
            } else {
                highlightedStarsPanel.style.display = 'none';
            }
        }
        
        function flyToStar(starGroup) {
            const targetPosition = starGroup.position.clone();
            const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
            const newCameraPosition = new THREE.Vector3().copy(targetPosition).add(direction.multiplyScalar(30));

            camera.position.copy(newCameraPosition);
            controls.target.copy(targetPosition);
        }

        function updateAllStarColors() {
            const isHabitableActive = habitableToggle.checked;
            starGroups.forEach(group => {
                const marker = group.children[0]; // The only child is the sprite
                const originalColor = originalColors.get(group);
                let newColor = originalColor.clone();

                if (highlightedStars.includes(group)) {
                    newColor.set(0xd33682); // Solarized Magenta for highlight
                } else if (isHabitableActive && group.userData.isHabitableCandidate) {
                    newColor.set(0x859900); // Solarized Green for habitable
                }
                marker.material.color.copy(newColor);
            });
        }

        gridToggle.addEventListener('change', (e) => {
            const isRadial = e.target.value === 'radial';
            galacticGrid.visible = !isRadial;
            radialLinesContainer.visible = isRadial;
            radialArcsContainer.visible = isRadial;
            pinGridControl.style.display = isRadial ? 'block' : 'none';
        });
        
        pinGridCheckbox.addEventListener('change', (e) => {
            isGridPinned = e.target.checked;
            if (isGridPinned) {
                const cameraInverse = camera.quaternion.clone().invert();
                gridOffsetQuaternion.copy(cameraInverse).multiply(radialArcsContainer.quaternion);
            }
        });

        resetButton.addEventListener('click', () => {
            controls.reset();
            pinGridCheckbox.checked = false;
            isGridPinned = false;
            radialArcsContainer.quaternion.identity();
        });

        highlightStarButton.addEventListener('click', () => {
            if (!selectedStarGroup) return;
            const index = highlightedStars.indexOf(selectedStarGroup);
            if (index > -1) {
                highlightedStars.splice(index, 1);
            } else {
                highlightedStars.push(selectedStarGroup);
            }
            highlightStarButton.textContent = highlightedStars.includes(selectedStarGroup) ? "Unhighlight Star" : "Highlight Star";
            updateAllStarColors();
            updateHighlightedStarsPanel();
        });

        function onClick(event) {
            if (intersects.length > 0) {
                const newSelectedGroup = intersects[0].object.parent;
                // No scaling on selection
                selectedStarGroup = newSelectedGroup;
                infoPanel.style.display = 'block';
                starName.textContent = selectedStarGroup.userData.name;
                starDistance.textContent = selectedStarGroup.userData.dist;
                starSpec.textContent = selectedStarGroup.userData.spec;
                starAbsMag.textContent = selectedStarGroup.userData.absmag;
                highlightStarButton.textContent = highlightedStars.includes(selectedStarGroup) ? "Unhighlight Star" : "Highlight Star";
            } else {
                 selectedStarGroup = null;
                 infoPanel.style.display = 'none';
            }
        }
        
        habitableToggle.addEventListener('change', updateAllStarColors);
        window.addEventListener('mousemove', (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
        window.addEventListener('click', onClick, false);

        function animate() {
            requestAnimationFrame(animate);

            if (isGridPinned) {
                radialArcsContainer.quaternion.copy(camera.quaternion).multiply(gridOffsetQuaternion);
            }

            raycaster.setFromCamera(mouse, camera);
            intersects = raycaster.intersectObjects(starGroups, true);
            
            // No hover effect
            
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>
