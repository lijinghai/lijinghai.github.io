(() => {
    "use strict";

    const $ = (selector) => document.querySelector(selector);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const lerp = (from, to, amount) => from + (to - from) * amount;

    const canvas = $("#bearCanvas");
    const viewport = $("#modelViewport");
    const loadingState = $("#loadingState");
    const dragHint = $("#dragHint");
    const autoRotateBtn = $("#autoRotateBtn");
    const scanBtn = $("#scanBtn");
    const introScanBtn = $("#introScanBtn");
    const resetBtn = $("#resetBtn");
    const focusBearBtn = $("#focusBearBtn");
    const lightRange = $("#lightRange");
    const lightOutput = $("#lightOutput");
    const angleReadout = $("#angleReadout");
    const zoomReadout = $("#zoomReadout");
    const poseReadout = $("#poseReadout");
    const renderReadout = $("#renderReadout");
    const coordX = $("#coordX");
    const coordY = $("#coordY");
    const coordZ = $("#coordZ");
    const liveClock = $("#liveClock");
    const featureIndex = $("#featureIndex");
    const featureTitle = $("#featureTitle");
    const featureDescription = $("#featureDescription");
    const featureTags = $("#featureTags");
    const featureSource = $("#featureSource");
    const featureButtons = [...document.querySelectorAll("[data-feature]")];

    const featureContent = {
        head: {
            index: "01 / HEAD TOUCH",
            title: "摸摸头，它会主动回应你",
            description: "头部内置一路电容触摸感应。轻轻摸头时，扬维斯会切换触摸反馈表情，并在空闲状态发出亲切问候。",
            tags: ["头部触摸", "表情反馈", "主动问候"],
            source: "YAVIS 固件头部触摸通道与触摸问候逻辑",
        },
        eyes: {
            index: "02 / DUAL EYES",
            title: "双眼屏幕，让情绪被看见",
            description: "双眼圆形屏幕会显示开心、思考、喜欢、休息等状态。语音和触摸发生时，眼睛会一起改变神态，让陪伴不只停留在声音里。",
            tags: ["双眼圆屏", "动态表情", "触摸联动"],
            source: "YAVIS 双眼显示固件与统一表情资产",
        },
        voice: {
            index: "03 / VOICE",
            title: "“小扬同学”语音唤醒",
            description: "喊一声“小扬同学”，扬维斯就能进入对话。它会用亲切、年轻、有校园感的语气回应你。",
            tags: ["自定义唤醒词", "自然语音对话", "校园伙伴人格"],
            source: "YAVIS 固件自定义唤醒词与语音对话链路",
        },
        core: {
            index: "04 / YZU KNOWLEDGE",
            title: "专属于扬州大学的知识核心",
            description: "扬维斯接入扬州大学校园知识内容，可以讲校史、校训、校区地标、校园生活和学习成长；涉及政策与流程时，会提醒以学校最新官方信息为准。",
            tags: ["扬大校史", "校园生活", "学习成长", "知识边界"],
            source: "扬州大学校园知识库与 YAVIS 校园伙伴人格",
        },
        touch: {
            index: "05 / BODY TOUCH",
            title: "身体触摸，让拥抱也有回应",
            description: "身体内置第二路触摸感应，与头部触摸共同组成双路互动。轻触或拥抱时，玩偶能够识别触摸并给出表情和语音反馈。",
            tags: ["身体触摸", "双路感应", "拥抱反馈"],
            source: "YAVIS 固件身体触摸通道与自适应触摸基线",
        },
        button: {
            index: "06 / CHAT BUTTON",
            title: "藏在手部的对话控制键",
            description: "短按可以切换聊天状态，让扬维斯随时进入或退出对话；长按可以重置网络配置，方便现场展示和重新连接。",
            tags: ["短按对话", "快速唤醒", "长按配网"],
            source: "YAVIS 固件 BOOT 按键聊天与网络配置逻辑",
        },
    };

    function activateFeature(key) {
        const content = featureContent[key];
        if (!content || !featureTitle) return;

        featureIndex.textContent = content.index;
        featureTitle.textContent = content.title;
        featureDescription.textContent = content.description;
        featureTags.replaceChildren(...content.tags.map((tag) => {
            const element = document.createElement("span");
            element.textContent = tag;
            return element;
        }));
        featureSource.textContent = content.source;

        featureButtons.forEach((button) => {
            const active = button.dataset.feature === key;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });
    }

    featureButtons.forEach((button) => {
        const activate = () => activateFeature(button.dataset.feature);
        button.addEventListener("mouseenter", activate);
        button.addEventListener("focus", activate);
        button.addEventListener("click", activate);
    });

    activateFeature("voice");

    const state = {
        autoRotate: true,
        scanMode: false,
        dragging: false,
        pointerId: null,
        lastX: 0,
        lastY: 0,
        targetYaw: 0.0,
        targetPitch: -0.025,
        yaw: 0.0,
        pitch: -0.025,
        targetZoom: 1.0,
        zoom: 1.0,
        light: 0.82,
        interacted: false,
    };

    function updateClock() {
        liveClock.textContent = new Intl.DateTimeFormat("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).format(new Date());
    }

    updateClock();
    window.setInterval(updateClock, 1000);

    function setToggle(button, active) {
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    }

    function setScanMode(active) {
        state.scanMode = active;
        viewport.classList.toggle("scan-active", active);
        setToggle(scanBtn, active);
        introScanBtn.innerHTML = active ? "关闭数字扫描 <span>↗</span>" : "开启数字扫描 <span>↗</span>";
        renderReadout.textContent = active ? "扫描解析" : "实时暖光";
    }

    function setAutoRotate(active) {
        state.autoRotate = active;
        setToggle(autoRotateBtn, active);
    }

    autoRotateBtn.addEventListener("click", () => setAutoRotate(!state.autoRotate));
    scanBtn.addEventListener("click", () => setScanMode(!state.scanMode));
    introScanBtn.addEventListener("click", () => setScanMode(!state.scanMode));

    resetBtn.addEventListener("click", () => {
        state.targetYaw = 0;
        state.targetPitch = -0.025;
        state.targetZoom = 1;
        setAutoRotate(true);
    });

    focusBearBtn.addEventListener("click", () => {
        state.targetZoom = state.targetZoom > 1.12 ? 1 : 1.2;
        viewport.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    function updateLightControl() {
        const value = Number(lightRange.value);
        state.light = value / 100;
        lightOutput.textContent = String(value);
        const percent = ((value - 30) / 90) * 100;
        lightRange.style.background = `linear-gradient(90deg, var(--amber) 0 ${percent}%, rgba(74, 50, 31, 0.15) ${percent}%)`;
    }

    lightRange.addEventListener("input", updateLightControl);
    updateLightControl();

    viewport.tabIndex = 0;
    viewport.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 && event.pointerType === "mouse") return;
        state.dragging = true;
        state.pointerId = event.pointerId;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.interacted = true;
        viewport.classList.add("is-dragging");
        viewport.setPointerCapture(event.pointerId);
        dragHint.classList.add("is-hidden");
        setAutoRotate(false);
    });

    viewport.addEventListener("pointermove", (event) => {
        if (!state.dragging || state.pointerId !== event.pointerId) return;
        const dx = event.clientX - state.lastX;
        const dy = event.clientY - state.lastY;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.targetYaw = clamp(state.targetYaw + dx * 0.0062, -0.43, 0.43);
        state.targetPitch = clamp(state.targetPitch + dy * 0.0042, -0.18, 0.16);
    });

    function endPointer(event) {
        if (state.pointerId !== event.pointerId) return;
        state.dragging = false;
        state.pointerId = null;
        viewport.classList.remove("is-dragging");
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    }

    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);

    viewport.addEventListener("wheel", (event) => {
        event.preventDefault();
        state.interacted = true;
        dragHint.classList.add("is-hidden");
        state.targetZoom = clamp(state.targetZoom - event.deltaY * 0.00075, 0.86, 1.28);
    }, { passive: false });

    viewport.addEventListener("keydown", (event) => {
        const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        setAutoRotate(false);
        if (event.key === "ArrowLeft") state.targetYaw = clamp(state.targetYaw - 0.06, -0.43, 0.43);
        if (event.key === "ArrowRight") state.targetYaw = clamp(state.targetYaw + 0.06, -0.43, 0.43);
        if (event.key === "ArrowUp") state.targetPitch = clamp(state.targetPitch - 0.05, -0.18, 0.16);
        if (event.key === "ArrowDown") state.targetPitch = clamp(state.targetPitch + 0.05, -0.18, 0.16);
        if (event.key === "+" || event.key === "=") state.targetZoom = clamp(state.targetZoom + 0.05, 0.86, 1.28);
        if (event.key === "-") state.targetZoom = clamp(state.targetZoom - 0.05, 0.86, 1.28);
    });

    window.setTimeout(() => dragHint.classList.add("is-hidden"), 6500);

    const vertexShaderSource = `#version 300 es
        precision highp float;

        in vec2 aPosition;
        in vec2 aUv;

        uniform sampler2D uDepthMap;
        uniform vec2 uTexel;
        uniform float uTime;
        uniform float uYaw;
        uniform float uPitch;
        uniform float uZoom;
        uniform float uAspect;
        uniform float uRelief;

        out vec2 vUv;
        out vec3 vNormal;
        out float vDepth;

        vec3 rotateX(vec3 point, float angle) {
            float c = cos(angle);
            float s = sin(angle);
            return vec3(point.x, point.y * c - point.z * s, point.y * s + point.z * c);
        }

        vec3 rotateY(vec3 point, float angle) {
            float c = cos(angle);
            float s = sin(angle);
            return vec3(point.x * c + point.z * s, point.y, -point.x * s + point.z * c);
        }

        void main() {
            float depth = texture(uDepthMap, aUv).r;
            float leftDepth = texture(uDepthMap, aUv - vec2(uTexel.x, 0.0)).r;
            float rightDepth = texture(uDepthMap, aUv + vec2(uTexel.x, 0.0)).r;
            float downDepth = texture(uDepthMap, aUv - vec2(0.0, uTexel.y)).r;
            float upDepth = texture(uDepthMap, aUv + vec2(0.0, uTexel.y)).r;

            vec3 position = vec3(aPosition, (depth - 0.13) * uRelief);
            position.y += sin(uTime * 1.18) * 0.008;
            vec3 normal = normalize(vec3((leftDepth - rightDepth) * 15.0, (downDepth - upDepth) * 15.0, 1.0));

            position = rotateX(position, uPitch);
            position = rotateY(position, uYaw);
            normal = rotateX(normal, uPitch);
            normal = rotateY(normal, uYaw);
            position.z -= 3.25;

            float focal = 2.20 * uZoom;
            float nearPlane = 0.1;
            float farPlane = 10.0;
            gl_Position = vec4(
                position.x * focal / uAspect,
                position.y * focal,
                ((farPlane + nearPlane) / (nearPlane - farPlane)) * position.z +
                    (2.0 * farPlane * nearPlane) / (nearPlane - farPlane),
                -position.z
            );

            vUv = aUv;
            vNormal = normal;
            vDepth = depth;
        }
    `;

    const fragmentShaderSource = `#version 300 es
        precision highp float;

        uniform sampler2D uColorMap;
        uniform float uTime;
        uniform float uLight;
        uniform float uScan;

        in vec2 vUv;
        in vec3 vNormal;
        in float vDepth;

        out vec4 outColor;

        void main() {
            vec4 textureColor = texture(uColorMap, vUv);
            if (textureColor.a < 0.025) discard;

            vec3 normal = normalize(vNormal);
            vec3 lightDirection = normalize(vec3(-0.38, 0.66, 0.86));
            vec3 viewDirection = vec3(0.0, 0.0, 1.0);
            float diffuse = max(dot(normal, lightDirection), 0.0);
            float backFill = max(dot(normal, -lightDirection), 0.0);
            float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.3);
            float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 22.0);

            float warmth = 0.82 + diffuse * (0.22 * uLight) - backFill * 0.035;
            vec3 color = textureColor.rgb * warmth;
            color += vec3(1.0, 0.76, 0.48) * specular * 0.075 * uLight;
            color += vec3(0.96, 0.76, 0.52) * rim * 0.04;

            if (uScan > 0.5) {
                float scanBand = 1.0 - smoothstep(0.0, 0.035, abs(fract(vUv.y * 1.25 - uTime * 0.18) - 0.5));
                float gridX = 1.0 - smoothstep(0.0, 0.06, abs(fract(vUv.x * 22.0) - 0.5));
                float gridY = 1.0 - smoothstep(0.0, 0.06, abs(fract(vUv.y * 28.0) - 0.5));
                float grid = max(gridX, gridY) * 0.13;
                vec3 scanColor = mix(vec3(0.23, 0.42, 0.37), vec3(0.88, 0.48, 0.20), vDepth);
                color = mix(color, scanColor, 0.36 + grid);
                color += vec3(1.0, 0.58, 0.24) * scanBand * 0.38;
            }

            outColor = vec4(color, textureColor.a);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(error || "Shader compilation failed");
        }
        return shader;
    }

    function createProgram(gl) {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(error || "Program linking failed");
        }
        return program;
    }

    function buildGrid(gl, columns = 96, rows = 128) {
        const vertexCount = (columns + 1) * (rows + 1);
        const positions = new Float32Array(vertexCount * 2);
        const uvs = new Float32Array(vertexCount * 2);
        const indices = new Uint16Array(columns * rows * 6);
        let vertexOffset = 0;

        for (let row = 0; row <= rows; row += 1) {
            const v = row / rows;
            for (let column = 0; column <= columns; column += 1) {
                const u = column / columns;
                positions[vertexOffset] = (u - 0.5) * 1.50;
                positions[vertexOffset + 1] = (0.5 - v) * 2.0;
                uvs[vertexOffset] = u;
                uvs[vertexOffset + 1] = 1.0 - v;
                vertexOffset += 2;
            }
        }

        let indexOffset = 0;
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const topLeft = row * (columns + 1) + column;
                const topRight = topLeft + 1;
                const bottomLeft = topLeft + columns + 1;
                const bottomRight = bottomLeft + 1;
                indices[indexOffset++] = topLeft;
                indices[indexOffset++] = bottomLeft;
                indices[indexOffset++] = topRight;
                indices[indexOffset++] = topRight;
                indices[indexOffset++] = bottomLeft;
                indices[indexOffset++] = bottomRight;
            }
        }

        const vertexArray = gl.createVertexArray();
        gl.bindVertexArray(vertexArray);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        gl.bindVertexArray(null);
        return { vertexArray, positionBuffer, uvBuffer, indexBuffer, count: indices.length };
    }

    function loadImage(source) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.decoding = "async";
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Unable to load ${source}`));
            image.src = source;
        });
    }

    function createTexture(gl, image, unit) {
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        return texture;
    }

    function showFallback(message) {
        console.warn(message);
        renderReadout.textContent = "2D 兼容模式";
        loadingState.classList.add("is-hidden");
    }

    async function startWebGL() {
        const gl = canvas.getContext("webgl2", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: false,
            powerPreference: "high-performance",
        });
        if (!gl) {
            showFallback("WebGL2 is unavailable");
            return;
        }

        try {
            const [colorImage, depthImage] = await Promise.all([
                loadImage("images/bear-twin/toy-transparent-v3.png"),
                loadImage("images/bear-twin/toy-depth-v3.png"),
            ]);

            const program = createProgram(gl);
            const grid = buildGrid(gl);
            const colorTexture = createTexture(gl, colorImage, 0);
            const depthTexture = createTexture(gl, depthImage, 1);

            gl.useProgram(program);
            gl.bindVertexArray(grid.vertexArray);

            const positionLocation = gl.getAttribLocation(program, "aPosition");
            gl.bindBuffer(gl.ARRAY_BUFFER, grid.positionBuffer);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            const uvLocation = gl.getAttribLocation(program, "aUv");
            gl.bindBuffer(gl.ARRAY_BUFFER, grid.uvBuffer);
            gl.enableVertexAttribArray(uvLocation);
            gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, grid.indexBuffer);

            const uniforms = {
                colorMap: gl.getUniformLocation(program, "uColorMap"),
                depthMap: gl.getUniformLocation(program, "uDepthMap"),
                texel: gl.getUniformLocation(program, "uTexel"),
                time: gl.getUniformLocation(program, "uTime"),
                yaw: gl.getUniformLocation(program, "uYaw"),
                pitch: gl.getUniformLocation(program, "uPitch"),
                zoom: gl.getUniformLocation(program, "uZoom"),
                aspect: gl.getUniformLocation(program, "uAspect"),
                relief: gl.getUniformLocation(program, "uRelief"),
                light: gl.getUniformLocation(program, "uLight"),
                scan: gl.getUniformLocation(program, "uScan"),
            };

            gl.uniform1i(uniforms.colorMap, 0);
            gl.uniform1i(uniforms.depthMap, 1);
            gl.uniform2f(uniforms.texel, 1 / depthImage.width, 1 / depthImage.height);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);

            function resizeCanvas() {
                const rect = canvas.getBoundingClientRect();
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const width = Math.max(1, Math.round(rect.width * dpr));
                const height = Math.max(1, Math.round(rect.height * dpr));
                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;
                }
                gl.viewport(0, 0, width, height);
                return width / height;
            }

            document.body.classList.add("webgl-ready");
            loadingState.classList.add("is-hidden");
            renderReadout.textContent = "实时暖光";

            const startTime = performance.now();
            function render(now) {
                const elapsed = (now - startTime) / 1000;
                const autoYaw = state.autoRotate && !state.dragging ? Math.sin(elapsed * 0.46) * 0.145 : 0;
                const desiredYaw = state.targetYaw + autoYaw;
                state.yaw = lerp(state.yaw, desiredYaw, 0.065);
                state.pitch = lerp(state.pitch, state.targetPitch, 0.07);
                state.zoom = lerp(state.zoom, state.targetZoom, 0.075);

                const aspect = resizeCanvas();
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                gl.useProgram(program);
                gl.bindVertexArray(grid.vertexArray);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, colorTexture);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, depthTexture);
                gl.uniform1f(uniforms.time, elapsed);
                gl.uniform1f(uniforms.yaw, state.yaw);
                gl.uniform1f(uniforms.pitch, state.pitch);
                gl.uniform1f(uniforms.zoom, state.zoom);
                gl.uniform1f(uniforms.aspect, aspect);
                gl.uniform1f(uniforms.relief, 0.62);
                gl.uniform1f(uniforms.light, state.light);
                gl.uniform1f(uniforms.scan, state.scanMode ? 1 : 0);
                gl.drawElements(gl.TRIANGLES, grid.count, gl.UNSIGNED_SHORT, 0);

                const degrees = state.yaw * (180 / Math.PI);
                angleReadout.textContent = `${degrees >= 0 ? "+" : ""}${degrees.toFixed(1)}°`;
                zoomReadout.textContent = `${Math.round(state.zoom * 100)}%`;
                poseReadout.textContent = Math.abs(degrees) < 3 ? "正面巡航" : degrees > 0 ? "向右观察" : "向左观察";
                coordX.textContent = (state.yaw * 0.68).toFixed(2);
                coordY.textContent = (-state.pitch * 0.72).toFixed(2);
                coordZ.textContent = state.zoom.toFixed(2);
                document.documentElement.style.setProperty("--shadow-x", `${Math.round(state.yaw * 26)}px`);

                window.requestAnimationFrame(render);
            }

            window.requestAnimationFrame(render);
        } catch (error) {
            showFallback(error);
        }
    }

    startWebGL();
})();
