// ALIENGOTCHI - VERSIÓN COMPLETA CON LOCALSTORAGE Y SELECTOR DE ALIENS
(function(){
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Aliengotchi iniciado");

        // ========= CONFIGURACIÓN DE ALIENÍGENAS =========
        const ALIEN_CONFIG = {
            verde: {
                normal: 'images/alien_verde/normal.png',
                angry: 'images/alien_verde/angry.png',
                sleepy: 'images/alien_verde/sleepy.png',
                sad: 'images/alien_verde/sad.png',
                dead: 'images/alien_verde/dead.png'
            },
            azul: {
                normal: 'images/alien_azul/normal.png',
                angry: 'images/alien_azul/angry.png',
                sleepy: 'images/alien_azul/sleepy.png',
                sad: 'images/alien_azul/sad.png',
                dead: 'images/alien_azul/dead.png'
            },
            rojo: {
                normal: 'images/alien_rojo/normal.png',
                angry: 'images/alien_rojo/angry.png',
                sleepy: 'images/alien_rojo/sleepy.png',
                sad: 'images/alien_rojo/sad.png',
                dead: 'images/alien_rojo/dead.png'
            }
        };
        let alienActual = null;

        // Comidas
        const FOODS = [
            { id: 'agua', nombre: 'Agua', efecto: { hambre: 15, energia: 10, diversion: 5 }, img: 'images/agua.png' },
            { id: 'cerveza', nombre: 'Cerveza', efecto: { hambre: 10, energia: -10, diversion: 15 }, img: 'images/cerveza.png' },
            { id: 'carne', nombre: 'Carne', efecto: { hambre: 35, energia: 5, diversion: 5 }, img: 'images/carne.png' },
            { id: 'fruta', nombre: 'Fruta', efecto: { hambre: 20, energia: 15, diversion: 10 }, img: 'images/fruta.png' },
            { id: 'postre', nombre: 'Postre', efecto: { hambre: 25, energia: -5, diversion: 25 }, img: 'images/postre.png' }
        ];

        // Elementos DOM
        const elements = {
            alienImg: document.getElementById('alienAvatarImg'),
            alienContainer: document.getElementById('alienContainer'),
            barHunger: document.getElementById('barHunger'),
            barEnergy: document.getElementById('barEnergy'),
            barFun: document.getElementById('barFun'),
            valHunger: document.getElementById('valHunger'),
            valEnergy: document.getElementById('valEnergy'),
            valFun: document.getElementById('valFun'),
            btnFeed: document.getElementById('btnFeed'),
            btnSleep: document.getElementById('btnSleep'),
            btnPlay: document.getElementById('btnPlay'),
            btnReset: document.getElementById('btnReset'),
            ledStatus: document.getElementById('ledStatus'),
            lampLight: document.getElementById('lampLight'),
            lamp: document.getElementById('lamp'),
            fridge: document.getElementById('fridge'),
            fridgeImage: document.getElementById('fridgeImage'),
            bedImage: document.getElementById('bedImage'),
            gameMenu: document.getElementById('gameMenu'),
            gameContainer: document.getElementById('gameContainer'),
            gameContent: document.getElementById('gameContent'),
            gameTitle: document.getElementById('gameTitle'),
            exitGameBtn: document.getElementById('exitGameBtn'),
            gameOverlay: document.getElementById('gameOverlay'),
            gameoverMsg: document.getElementById('gameoverMsg'),
            resetOverlay: document.getElementById('resetFromOverlay'),
            room: document.querySelector('.room'),
            foodMenu: document.getElementById('foodMenu'),
            foodOptions: document.getElementById('foodOptions'),
            closeFoodMenuBtn: document.getElementById('closeFoodMenuBtn'),
            adoptionScreen: document.getElementById('adoptionScreen')
        };

        // Constantes
        const STAT_MAX = 100;
        const STAT_CRITICAL = 30;
        const DECAY_HUNGER = 1;
        const DECAY_ENERGY = 0.5;
        const DECAY_FUN = 2;
        const FUN_WIN_RESTORE = 35;
        const GAME_LOOP_MS = 6000;

        // Estado
        let mascota = { hambre: STAT_MAX, energia: STAT_MAX, diversion: STAT_MAX, viva: true };
        let durmiendo = false;
        let juegoActivo = false;
        let gameLoop = null;
        let neveraAbierta = false;

        // Estado del lanzamiento
        let dragging = false;
        let dragStartX = 0, dragStartY = 0;
        let dragStartTime = 0;
        let alienVelocity = { x: 0, y: 0 };
        let alienPos = { x: 0, y: 0 };
        let animFrame = null;
        let lanzamientoActivo = false;
        let rebotesAcumulados = 0;
        let gananciaAcumulada = false;
        let volviendoAlOrigen = false;

        // ==================== LOCALSTORAGE ====================
        function guardarPartida() {
            const estado = {
                mascota: {
                    hambre: mascota.hambre,
                    energia: mascota.energia,
                    diversion: mascota.diversion,
                    viva: mascota.viva
                },
                durmiendo: durmiendo,
                alienActual: alienActual
            };
            localStorage.setItem('aliengotchi_save', JSON.stringify(estado));
        }

        function cargarPartida() {
            const guardado = localStorage.getItem('aliengotchi_save');
            if (guardado) {
                try {
                    const data = JSON.parse(guardado);
                    mascota = data.mascota;
                    durmiendo = data.durmiendo || false;
                    alienActual = data.alienActual || 'verde';
                    actualizarUI();
                    if (durmiendo) {
                        elements.bedImage.src = 'images/cama_ocupada.png';
                        elements.alienContainer.classList.add('sleeping');
                        elements.lampLight.classList.add('off');
                        if (elements.room) elements.room.classList.add('dark-room');
                    }
                    return true;
                } catch(e) { console.warn(e); }
            }
            return false;
        }

        // ==================== FUNCIONES PRINCIPALES ====================
        function clamp(val) { return Math.min(STAT_MAX, Math.max(0, val)); }

        function setAlienImage(estado) {
            if (!alienActual) return;
            const img = elements.alienImg;
            const url = ALIEN_CONFIG[alienActual][estado];
            img.src = url;
            img.onerror = () => {
                img.style.display = 'none';
                let fallback = document.getElementById('alienFallback');
                if (!fallback) {
                    fallback = document.createElement('div');
                    fallback.id = 'alienFallback';
                    fallback.className = 'alien-avatar';
                    fallback.style.fontSize = '80px';
                    fallback.style.textAlign = 'center';
                    img.parentNode.appendChild(fallback);
                }
                fallback.style.display = 'block';
                let text = '';
                if (estado === 'angry') text = '😡';
                else if (estado === 'sleepy') text = '😴';
                else if (estado === 'sad') text = '😢';
                else if (estado === 'dead') text = '💀';
                else text = '👾';
                fallback.innerText = text;
            };
            img.style.display = 'block';
            const fallback = document.getElementById('alienFallback');
            if (fallback) fallback.style.display = 'none';
        }

        function mostrarMensaje(texto, x, y, color = "#f1c40f") {
            const msgDiv = document.createElement('div');
            msgDiv.textContent = texto;
            msgDiv.style.position = 'absolute';
            msgDiv.style.left = (x || 50) + 'px';
            msgDiv.style.top = (y || 50) + 'px';
            msgDiv.style.fontSize = '18px';
            msgDiv.style.fontWeight = 'bold';
            msgDiv.style.color = color;
            msgDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
            msgDiv.style.padding = '8px 15px';
            msgDiv.style.borderRadius = '30px';
            msgDiv.style.pointerEvents = 'none';
            msgDiv.style.zIndex = '100';
            msgDiv.style.whiteSpace = 'nowrap';
            elements.room.appendChild(msgDiv);
            setTimeout(() => msgDiv.remove(), 1200);
        }

        function actualizarUI() {
            if (!elements.barHunger) return;
            elements.barHunger.style.width = mascota.hambre + '%';
            elements.barEnergy.style.width = mascota.energia + '%';
            elements.barFun.style.width = mascota.diversion + '%';
            elements.valHunger.innerText = Math.floor(mascota.hambre);
            elements.valEnergy.innerText = Math.floor(mascota.energia);
            elements.valFun.innerText = Math.floor(mascota.diversion);

            if (!mascota.viva) {
                setAlienImage('dead');
            } else if (mascota.hambre <= STAT_CRITICAL) {
                setAlienImage('angry');
            } else if (mascota.energia <= STAT_CRITICAL) {
                setAlienImage('sleepy');
            } else if (mascota.diversion <= STAT_CRITICAL) {
                setAlienImage('sad');
            } else {
                setAlienImage('normal');
            }

            if (mascota.viva) elements.ledStatus.classList.remove('led--off');
            else elements.ledStatus.classList.add('led--off');
        }

        function restaurarPosicionOriginal() {
            elements.alienContainer.style.position = 'absolute';
            elements.alienContainer.style.bottom = '75px';
            elements.alienContainer.style.left = '50%';
            elements.alienContainer.style.transform = 'translateX(-50%)';
            elements.alienContainer.style.top = 'auto';
            elements.alienContainer.style.right = 'auto';
            elements.alienContainer.style.left = '';
            elements.alienContainer.style.top = '';
        }

        function dormir() {
            if (!mascota.viva || juegoActivo) return;
            if (durmiendo) {
                durmiendo = false;
                elements.alienContainer.classList.remove('sleeping');
                elements.lampLight.classList.remove('off');
                if (elements.room) elements.room.classList.remove('dark-room');
                elements.bedImage.src = 'images/cama.png';
                elements.alienContainer.style.opacity = '';
                elements.alienContainer.style.visibility = '';
                elements.alienContainer.style.pointerEvents = '';
                restaurarPosicionOriginal();
                mostrarMensaje("Buenos días", 100, 80, "#3498db");
            } else {
                durmiendo = true;
                elements.bedImage.src = 'images/cama_ocupada.png';
                elements.alienContainer.classList.add('sleeping');
                elements.alienContainer.style.opacity = '0';
                elements.alienContainer.style.visibility = 'hidden';
                elements.alienContainer.style.pointerEvents = 'none';
                elements.lampLight.classList.add('off');
                if (elements.room) elements.room.classList.add('dark-room');
                mostrarMensaje("Zzz...", 100, 80, "#9b59b6");
            }
            actualizarUI();
            guardarPartida();
        }

        function alimentarConComida(comida) {
            if (!mascota.viva || juegoActivo) return;
            let efecto = comida.efecto;
            mascota.hambre = clamp(mascota.hambre + efecto.hambre);
            mascota.energia = clamp(mascota.energia + efecto.energia);
            mascota.diversion = clamp(mascota.diversion + efecto.diversion);
            actualizarUI();
            let mensaje = `${comida.nombre}: +${efecto.hambre} HAM, ${efecto.energia>=0?'+':''}${efecto.energia} ENE, ${efecto.diversion>=0?'+':''}${efecto.diversion} DIV`;
            mostrarMensaje(mensaje, 30, 30, "#2ecc71");
            cerrarMenuComida();
            guardarPartida();
        }

        function abrirMenuComida() {
            if (!mascota.viva || juegoActivo) return;
            if (!neveraAbierta) {
                neveraAbierta = true;
                elements.fridgeImage.src = 'images/nevera_abierta.png';
            }
            elements.foodOptions.innerHTML = '';
            FOODS.forEach(food => {
                const btn = document.createElement('button');
                btn.className = 'food-option';
                const img = document.createElement('img');
                img.src = food.img;
                img.alt = food.nombre;
                img.onerror = () => { img.style.display = 'none'; };
                const span = document.createElement('span');
                span.textContent = food.nombre;
                btn.appendChild(img);
                btn.appendChild(span);
                btn.onclick = (e) => {
                    e.stopPropagation();
                    alimentarConComida(food);
                };
                elements.foodOptions.appendChild(btn);
            });
            elements.foodMenu.classList.remove('hidden');
        }

        function cerrarMenuComida() {
            elements.foodMenu.classList.add('hidden');
            if (neveraAbierta) {
                neveraAbierta = false;
                elements.fridgeImage.src = 'images/nevera.png';
            }
        }

        function tick() {
            if (!mascota.viva || juegoActivo) return;
            if (durmiendo) {
                mascota.energia = clamp(mascota.energia + 3);
            } else {
                mascota.hambre = clamp(mascota.hambre - DECAY_HUNGER);
                mascota.energia = clamp(mascota.energia - DECAY_ENERGY);
                mascota.diversion = clamp(mascota.diversion - DECAY_FUN);
            }
            actualizarUI();
            if (mascota.hambre <= 0 || mascota.energia <= 0 || mascota.diversion <= 0) {
                gameOver();
            }
            guardarPartida();
        }

        function gameOver() {
            if (!mascota.viva) return;
            mascota.viva = false;
            if (gameLoop) clearInterval(gameLoop);
            if (durmiendo) dormir();
            if (lanzamientoActivo) detenerLanzamiento(false);
            actualizarUI();
            let msg = "Tu alien ha muerto...";
            if (mascota.hambre <= 0) msg = "Murió de hambre";
            else if (mascota.energia <= 0) msg = "Murió de sueño";
            else if (mascota.diversion <= 0) msg = "Murió de aburrimiento";
            elements.gameoverMsg.innerText = msg;
            elements.gameOverlay.classList.remove('hidden');
            elements.gameOverlay.style.display = 'flex';
            guardarPartida();
        }

        function reiniciar() {
            if (gameLoop) clearInterval(gameLoop);
            if (lanzamientoActivo) detenerLanzamiento(false);
            if (volviendoAlOrigen) volviendoAlOrigen = false;
            mascota = { hambre: STAT_MAX, energia: STAT_MAX, diversion: STAT_MAX, viva: true };
            durmiendo = false;
            juegoActivo = false;
            elements.alienContainer.classList.remove('sleeping');
            elements.alienContainer.style.opacity = '';
            elements.alienContainer.style.visibility = '';
            elements.alienContainer.style.pointerEvents = '';
            elements.bedImage.src = 'images/cama.png';
            elements.lampLight.classList.remove('off');
            if (elements.room) elements.room.classList.remove('dark-room');
            if (neveraAbierta) {
                neveraAbierta = false;
                elements.fridgeImage.src = 'images/nevera.png';
            }
            elements.gameContainer.classList.add('hidden');
            elements.gameMenu.classList.add('hidden');
            elements.foodMenu.classList.add('hidden');
            elements.gameOverlay.classList.add('hidden');
            restaurarPosicionOriginal();
            actualizarUI();
            gameLoop = setInterval(tick, GAME_LOOP_MS);
            guardarPartida();
        }

        // ==================== FÍSICA DEL LANZAMIENTO ====================
        function obtenerPosicionOriginal() {
            const roomRect = elements.room.getBoundingClientRect();
            const alienWidth = elements.alienContainer.offsetWidth;
            const alienHeight = elements.alienContainer.offsetHeight;
            const originalX = (roomRect.width / 2) - (alienWidth / 2);
            const originalY = roomRect.height - alienHeight - 75;
            return { x: Math.max(0, originalX), y: Math.max(0, originalY) };
        }

        function moverAPosicionOriginal() {
            if (volviendoAlOrigen) return;
            volviendoAlOrigen = true;
            const destino = obtenerPosicionOriginal();
            const startX = alienPos.x;
            const startY = alienPos.y;
            const startTime = performance.now();
            const DURACION = 400;
            function animarRetorno(now) {
                const elapsed = now - startTime;
                let t = Math.min(1, elapsed / DURACION);
                const ease = 1 - Math.pow(1 - t, 3);
                const newX = startX + (destino.x - startX) * ease;
                const newY = startY + (destino.y - startY) * ease;
                elements.alienContainer.style.left = newX + 'px';
                elements.alienContainer.style.top = newY + 'px';
                alienPos.x = newX;
                alienPos.y = newY;
                if (t < 1) {
                    requestAnimationFrame(animarRetorno);
                } else {
                    restaurarPosicionOriginal();
                    volviendoAlOrigen = false;
                    lanzamientoActivo = false;
                }
            }
            requestAnimationFrame(animarRetorno);
        }

        function iniciarArrastre(e) {
            if (!mascota.viva || juegoActivo || durmiendo || volviendoAlOrigen) return;
            e.preventDefault();
            dragging = true;
            gananciaAcumulada = false;
            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            dragStartX = clientX;
            dragStartY = clientY;
            dragStartTime = Date.now();
            if (lanzamientoActivo) detenerLanzamiento(true);
            const rect = elements.alienContainer.getBoundingClientRect();
            const roomRect = elements.room.getBoundingClientRect();
            alienPos.x = rect.left - roomRect.left;
            alienPos.y = rect.top - roomRect.top;
            elements.alienContainer.style.position = 'absolute';
            elements.alienContainer.style.bottom = 'auto';
            elements.alienContainer.style.left = alienPos.x + 'px';
            elements.alienContainer.style.top = alienPos.y + 'px';
            elements.alienContainer.style.transform = 'none';
        }

        function moverArrastre(e) {
            if (!dragging) return;
            e.preventDefault();
            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            const roomRect = elements.room.getBoundingClientRect();
            let newX = clientX - roomRect.left - (elements.alienContainer.offsetWidth / 2);
            let newY = clientY - roomRect.top - (elements.alienContainer.offsetHeight / 2);
            newX = Math.min(Math.max(0, newX), roomRect.width - elements.alienContainer.offsetWidth);
            newY = Math.min(Math.max(0, newY), roomRect.height - elements.alienContainer.offsetHeight);
            elements.alienContainer.style.left = newX + 'px';
            elements.alienContainer.style.top = newY + 'px';
            alienPos.x = newX;
            alienPos.y = newY;
        }

        function soltarArrastre(e) {
            if (!dragging) return;
            dragging = false;
            let clientX, clientY;
            if (e.changedTouches) {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            } else if (e.clientX !== undefined) {
                clientX = e.clientX;
                clientY = e.clientY;
            } else {
                return;
            }
            const deltaX = clientX - dragStartX;
            const deltaY = clientY - dragStartY;
            const deltaTime = Math.max(10, Date.now() - dragStartTime);
            let speedX = deltaX / deltaTime * 15;
            let speedY = deltaY / deltaTime * 15;
            const minSpeed = 1.0;
            if (Math.abs(speedX) > minSpeed || Math.abs(speedY) > minSpeed) {
                alienVelocity = { x: speedX, y: speedY };
                lanzamientoActivo = true;
                rebotesAcumulados = 0;
                iniciarFisica();
            } else {
                mascota.diversion = clamp(mascota.diversion + 2);
                actualizarUI();
                mostrarMensaje("+2 DIV", alienPos.x, alienPos.y - 30, "#f1c40f");
                moverAPosicionOriginal();
                guardarPartida();
            }
        }

        function iniciarFisica() {
            if (animFrame) cancelAnimationFrame(animFrame);
            const roomRect = elements.room.getBoundingClientRect();
            const alienWidth = elements.alienContainer.offsetWidth;
            const alienHeight = elements.alienContainer.offsetHeight;
            const GRAVITY = 0.25;
            const BOUNCE = 0.65;
            const FRICTION_AIR = 0.98;
            let lastSpeed = Math.abs(alienVelocity.x) + Math.abs(alienVelocity.y);
            function actualizarFisica() {
                if (!lanzamientoActivo) return;
                alienVelocity.y += GRAVITY;
                alienVelocity.x *= FRICTION_AIR;
                alienVelocity.y *= FRICTION_AIR;
                alienPos.x += alienVelocity.x;
                alienPos.y += alienVelocity.y;
                let rebote = false;
                if (alienPos.x <= 0) {
                    alienPos.x = 0;
                    alienVelocity.x = -alienVelocity.x * BOUNCE;
                    rebote = true;
                }
                if (alienPos.x + alienWidth >= roomRect.width) {
                    alienPos.x = roomRect.width - alienWidth;
                    alienVelocity.x = -alienVelocity.x * BOUNCE;
                    rebote = true;
                }
                if (alienPos.y <= 0) {
                    alienPos.y = 0;
                    alienVelocity.y = -alienVelocity.y * BOUNCE;
                    rebote = true;
                }
                if (alienPos.y + alienHeight >= roomRect.height) {
                    alienPos.y = roomRect.height - alienHeight;
                    alienVelocity.y = -alienVelocity.y * BOUNCE;
                    rebote = true;
                }
                if (rebote) {
                    rebotesAcumulados++;
                    elements.alienContainer.style.transform = 'scale(0.85)';
                    setTimeout(() => {
                        if (elements.alienContainer) elements.alienContainer.style.transform = '';
                    }, 80);
                }
                elements.alienContainer.style.left = alienPos.x + 'px';
                elements.alienContainer.style.top = alienPos.y + 'px';
                const currentSpeed = Math.abs(alienVelocity.x) + Math.abs(alienVelocity.y);
                if (currentSpeed < 0.5 && !rebote && currentSpeed <= lastSpeed + 0.1) {
                    if (!gananciaAcumulada && rebotesAcumulados > 0) {
                        gananciaAcumulada = true;
                        let ganancia = Math.min(30, rebotesAcumulados * 2);
                        if (ganancia > 0) {
                            mascota.diversion = clamp(mascota.diversion + ganancia);
                            actualizarUI();
                            mostrarMensaje(`+${ganancia} DIV`, alienPos.x, alienPos.y - 30, "#f1c40f");
                            guardarPartida();
                        }
                    }
                    moverAPosicionOriginal();
                    return;
                }
                lastSpeed = currentSpeed;
                animFrame = requestAnimationFrame(actualizarFisica);
            }
            animFrame = requestAnimationFrame(actualizarFisica);
        }

        function detenerLanzamiento(volver = true) {
            if (animFrame) cancelAnimationFrame(animFrame);
            lanzamientoActivo = false;
            if (volver && !volviendoAlOrigen) {
                moverAPosicionOriginal();
            } else {
                const roomRect = elements.room.getBoundingClientRect();
                const alienWidth = elements.alienContainer.offsetWidth;
                const alienHeight = elements.alienContainer.offsetHeight;
                alienPos.x = Math.min(Math.max(0, alienPos.x), roomRect.width - alienWidth);
                alienPos.y = Math.min(Math.max(0, alienPos.y), roomRect.height - alienHeight);
                elements.alienContainer.style.left = alienPos.x + 'px';
                elements.alienContainer.style.top = alienPos.y + 'px';
                elements.alienContainer.style.transform = '';
            }
        }

        // ==================== MINIJUEGOS ====================
        function cerrarJuego() {
            juegoActivo = false;
            elements.gameContainer.classList.add('hidden');
            actualizarUI();
        }

        function sumarDiversion() {
            mascota.diversion = clamp(mascota.diversion + FUN_WIN_RESTORE);
            actualizarUI();
            mostrarMensaje("+35 DIV", 30, 30, "#2ecc71");
            guardarPartida();
        }

        function iniciarRPS() {
            let pJug = 0, pAlien = 0;
            elements.gameContent.innerHTML = `
                <div style="text-align:center; width:100%;">
                    <div style="display:flex; justify-content:space-around; margin-bottom:20px;">
                        <div><div style="font-size:40px; font-weight:bold;" id="playerChoiceText">?</div><div>TU</div></div>
                        <div><div style="font-size:40px; font-weight:bold;" id="alienChoiceText">?</div><div>ALIEN</div></div>
                    </div>
                    <div>MARCADOR: <span id="rpsScore">0-0</span></div>
                    <div class="rps-buttons" style="margin:15px 0;">
                        <button class="rps-btn" data-choice="rock">Piedra</button>
                        <button class="rps-btn" data-choice="paper">Papel</button>
                        <button class="rps-btn" data-choice="scissors">Tijeras</button>
                    </div>
                    <div id="rpsResult" style="font-size:16px; margin-top:10px;"></div>
                </div>
            `;
            const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
            const nombre = { rock: 'Piedra', paper: 'Papel', scissors: 'Tijeras' };
            const actualizar = () => {
                document.getElementById('rpsScore').innerText = `${pJug}-${pAlien}`;
                if (pJug >= 2) { sumarDiversion(); mostrarMensaje("Ganaste el juego", 150, 100); cerrarJuego(); }
                else if (pAlien >= 2) { mostrarMensaje("Perdiste el juego", 150, 100, "#e74c3c"); cerrarJuego(); }
            };
            const jugar = (jugador) => {
                if (pJug>=2 || pAlien>=2) return;
                const opciones = ['rock','paper','scissors'];
                const alien = opciones[Math.floor(Math.random()*3)];
                document.getElementById('playerChoiceText').innerText = nombre[jugador];
                document.getElementById('alienChoiceText').innerText = nombre[alien];
                let res = '';
                if (jugador === alien) res = 'Empate';
                else if (beats[jugador] === alien) { pJug++; res = 'Ganaste'; }
                else { pAlien++; res = 'Perdiste'; }
                document.getElementById('rpsResult').innerHTML = `${res} (Alien saco ${nombre[alien]})`;
                actualizar();
            };
            document.querySelectorAll('.rps-btn').forEach(btn => btn.onclick = () => jugar(btn.dataset.choice));
        }

        function iniciarMemory() {
            const pares = ['A','B','C','D'];
            let cartas = [...pares, ...pares];
            for (let i = cartas.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
            }
            let seleccion = [], bloqueado = false, encontrados = 0;
            elements.gameContent.innerHTML = `<div class="memory-grid" id="memoryGrid"></div>`;
            const grid = document.getElementById('memoryGrid');
            cartas.forEach(letra => {
                const card = document.createElement('div');
                card.className = 'memory-card';
                card.dataset.valor = letra;
                card.innerText = '?';
                card.onclick = () => {
                    if (bloqueado || card.innerText !== '?' || seleccion.includes(card)) return;
                    card.innerText = letra;
                    seleccion.push(card);
                    if (seleccion.length === 2) {
                        bloqueado = true;
                        setTimeout(() => {
                            const [a, b] = seleccion;
                            if (a.dataset.valor === b.dataset.valor) {
                                a.style.visibility = 'hidden';
                                b.style.visibility = 'hidden';
                                encontrados++;
                                if (encontrados === pares.length) {
                                    sumarDiversion();
                                    mostrarMensaje("Memoria perfecta", 150, 100);
                                    cerrarJuego();
                                }
                            } else {
                                a.innerText = '?';
                                b.innerText = '?';
                            }
                            seleccion = [];
                            bloqueado = false;
                        }, 600);
                    }
                };
                grid.appendChild(card);
            });
        }

        function iniciarSimon() {
            const colores = ['red', 'green', 'blue', 'yellow'];
            let secuencia = [];
            let indiceJugador = 0;
            let esperando = false;
            let ronda = 1;
            elements.gameContent.innerHTML = `
                <div class="simon-board">
                    <div class="simon-button red" data-color="red"></div>
                    <div class="simon-button green" data-color="green"></div>
                    <div class="simon-button blue" data-color="blue"></div>
                    <div class="simon-button yellow" data-color="yellow"></div>
                </div>
                <div class="simon-message" id="simonMsg">Ronda 1</div>
            `;
            const msgDiv = document.getElementById('simonMsg');
            function brillar(color, callback) {
                const btn = document.querySelector(`.simon-button.${color}`);
                if (!btn) return;
                btn.classList.add('active');
                setTimeout(() => {
                    btn.classList.remove('active');
                    if (callback) setTimeout(callback, 200);
                }, 300);
            }
            function reproducirSecuencia() {
                esperando = true;
                let i = 0;
                function siguiente() {
                    if (i >= secuencia.length) {
                        esperando = false;
                        msgDiv.innerText = `Tu turno (Ronda ${ronda})`;
                        return;
                    }
                    brillar(secuencia[i], () => { i++; siguiente(); });
                }
                siguiente();
            }
            function nuevaRonda() {
                const nuevoColor = colores[Math.floor(Math.random() * colores.length)];
                secuencia.push(nuevoColor);
                indiceJugador = 0;
                msgDiv.innerText = `Ronda ${ronda}`;
                setTimeout(() => reproducirSecuencia(), 500);
            }
            function manejarClick(color) {
                if (esperando) return;
                if (color === secuencia[indiceJugador]) {
                    brillar(color);
                    indiceJugador++;
                    if (indiceJugador === secuencia.length) {
                        esperando = true;
                        ronda++;
                        if (ronda > 5) {
                            sumarDiversion();
                            mostrarMensaje("Ganaste el Simon", 150, 100);
                            cerrarJuego();
                            return;
                        }
                        msgDiv.innerText = "Bien! Siguiente ronda";
                        setTimeout(() => nuevaRonda(), 800);
                    }
                } else {
                    mostrarMensaje("Fallaste", 150, 100, "#e74c3c");
                    cerrarJuego();
                }
            }
            document.querySelectorAll('.simon-button').forEach(btn => {
                btn.onclick = () => manejarClick(btn.dataset.color);
            });
            nuevaRonda();
        }

        function abrirMenuJuegos() {
            if (!mascota.viva || juegoActivo) return;
            elements.gameMenu.classList.remove('hidden');
        }

        function lanzarJuego(tipo) {
            elements.gameMenu.classList.add('hidden');
            juegoActivo = true;
            elements.gameContainer.classList.remove('hidden');
            if (tipo === 'rps') { elements.gameTitle.innerText = 'Piedra Papel Tijeras'; iniciarRPS(); }
            else if (tipo === 'memory') { elements.gameTitle.innerText = 'Memotest'; iniciarMemory(); }
            else if (tipo === 'simon') { elements.gameTitle.innerText = 'Simon Dice'; iniciarSimon(); }
        }

        // ==================== EVENTOS E INICIALIZACIÓN ====================
        function iniciarJuegoConAlien(tipo) {
            alienActual = tipo;
            elements.adoptionScreen.style.display = 'none';
            if (!cargarPartida()) {
                reiniciar();
            } else {
                if (gameLoop) clearInterval(gameLoop);
                gameLoop = setInterval(tick, GAME_LOOP_MS);
            }
            guardarPartida();
        }

        // Eventos de la pantalla de adopción
        document.querySelectorAll('.alien-card').forEach(card => {
            const btn = card.querySelector('button');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tipo = card.dataset.alien;
                iniciarJuegoConAlien(tipo);
            });
            card.addEventListener('click', () => {
                const tipo = card.dataset.alien;
                iniciarJuegoConAlien(tipo);
            });
        });

        // Eventos principales
        elements.btnFeed.onclick = abrirMenuComida;
        elements.btnSleep.onclick = dormir;
        elements.btnPlay.onclick = abrirMenuJuegos;
        elements.btnReset.onclick = reiniciar;
        elements.resetOverlay.onclick = reiniciar;
        elements.exitGameBtn.onclick = cerrarJuego;
        elements.lamp.onclick = dormir;
        elements.fridge.onclick = abrirMenuComida;
        if (elements.closeFoodMenuBtn) elements.closeFoodMenuBtn.onclick = cerrarMenuComida;

        // Arrastre del alien
        elements.alienContainer.addEventListener('mousedown', iniciarArrastre);
        window.addEventListener('mousemove', moverArrastre);
        window.addEventListener('mouseup', soltarArrastre);
        elements.alienContainer.addEventListener('touchstart', iniciarArrastre, {passive: false});
        window.addEventListener('touchmove', moverArrastre, {passive: false});
        window.addEventListener('touchend', soltarArrastre);

        document.querySelectorAll('.game-option').forEach(opt => opt.onclick = () => lanzarJuego(opt.dataset.game));
        document.getElementById('closeMenuBtn').onclick = () => elements.gameMenu.classList.add('hidden');

        // Mostrar pantalla de adopción y detener cualquier loop
        if (gameLoop) clearInterval(gameLoop);
        gameLoop = null;
        elements.adoptionScreen.style.display = 'flex';
    });
})();