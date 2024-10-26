// Obtener el elemento partiqleCanvas
var partiqleCanvas = document.getElementById("systemsCanvas");
var ctx = partiqleCanvas.getContext("2d");

// Establecer el tamaño del partiqleCanvas
partiqleCanvas.width = window.innerWidth;
partiqleCanvas.height = window.innerHeight;

// Definir las propiedades de la animación
var particleCount = 200;
var particleSize = 2;
var particleSpeed = 3;
var particleColor = "#000cff"; // Cian

// Crear un array para almacenar las partículas
var particles = [];

// Función para generar una partícula aleatoria
function generateParticle() {
    var particle = {
        x: Math.random() * partiqleCanvas.width,
        y: Math.random() * partiqleCanvas.height,
        angle: Math.random() * 2 * Math.PI,
        speed: particleSpeed * (Math.random() * 0.5 + 0.2),
    };
    return particle;
}

// Función para dibujar las partículas
function drawParticles() {
    ctx.clearRect(0, 0, partiqleCanvas.width, partiqleCanvas.height);

    // Dibujar las partículas y las conexiones
    for (var i = 0; i < particles.length; i++) {
        var particle = particles[i];

        // Dibujar la partícula
        ctx.fillStyle = particleColor;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particleSize, 0, 2 * Math.PI);
        ctx.fill();

        // Dibujar las conexiones
        for (var j = i + 1; j < particles.length; j++) {
            var otherParticle = particles[j];
            var distance = Math.sqrt(
                Math.pow(particle.x - otherParticle.x, 2) +
                Math.pow(particle.y - otherParticle.y, 2)
            );
            if (distance < 200) {
                ctx.strokeStyle =
                    "rgba(0, 255, 255, " + (1 - distance / 200) + ")";
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(otherParticle.x, otherParticle.y);
                ctx.stroke();
            }
        }

        // Actualizar la posición de la partícula
        particle.x += Math.cos(particle.angle) * particle.speed;
        particle.y += Math.sin(particle.angle) * particle.speed;

        // Si la partícula sale de la pantalla, regenerarla
        if (
            particle.x < -particleSize ||
            particle.x > partiqleCanvas.width + particleSize ||
            particle.y < -particleSize ||
            particle.y > partiqleCanvas.height + particleSize
        ) {
            particles[i] = generateParticle();
        }
    }

    requestAnimationFrame(drawParticles);
}

// Generar las partículas iniciales
for (var i = 0; i < particleCount; i++) {
    particles.push(generateParticle());
}

// Iniciar la animación
drawParticles();

 
 