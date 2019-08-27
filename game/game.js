const c=document.getElementById('c');
let screenWidth;
let screenHeight;
let scale = 2;
const setScreen = () => {
    screenWidth=c.width=c.clientWidth;
    screenHeight=c.height=c.clientHeight;
}
setScreen();
window.addEventListener('resize', setScreen);

const ctx=c.getContext("2d");
const level1 = {"walls":[[{"x":448,"y":960},{"x":448,"y":736},{"x":128,"y":736},{"x":128,"y":384},{"x":416,"y":384},{"x":416,"y":640},{"x":192,"y":640},{"x":192,"y":672},{"x":448,"y":672},{"x":448,"y":352},{"x":320,"y":352},{"x":320,"y":224},{"x":640,"y":224},{"x":640,"y":352},{"x":512,"y":352},{"x":512,"y":672},{"x":800,"y":672},{"x":800,"y":736},{"x":512,"y":736},{"x":512,"y":960}]],"doors":[{"name":"door2","polygon":[{"x":448,"y":352},{"x":512,"y":352},{"x":448,"y":352}],"open":false},{"name":"door1","polygon":[{"x":448,"y":672},{"x":448,"y":736},{"x":448,"y":672}],"open":false}],"switches":[{"x":352,"y":512,"target":"door2","type":"momentary"},{"x":769,"y":702,"target":"door1","type":"toggle"}],"start":{"x":480,"y":928},"end":{"x":480,"y":288}};
let camera = new Vec2(0,0);
const worldToScreen = ({x,y}) => ({
    x: (x-camera.x)*scale+screenWidth/2,
    y: (y-camera.y)*scale+screenHeight/2,
})
const clearScreen = () => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,screenWidth,screenHeight);
}
const setColor = (color) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
}
const drawPoly = polygon => {
    const screenPoly = polygon.map(worldToScreen);
    ctx.beginPath();
    ctx.moveTo(screenPoly[0].x, screenPoly[0].y);
    for(let i=1;i<screenPoly.length;i++)
        ctx.lineTo(screenPoly[i].x,screenPoly[i].y);
    ctx.closePath();
    ctx.stroke();
}
const drawCircle = (c,r,fill=false) => {
    const {x,y} = worldToScreen(c);
    ctx.beginPath();
    ctx.arc(x, y, r*scale, 0, 2 * Math.PI);
    ctx.stroke();
    if (fill) ctx.fill();
}
function doesLineInterceptCircle(A, B, C, radius) {
    let dist;
    const v1x = B.x - A.x;
    const v1y = B.y - A.y;
    const v2x = C.x - A.x;
    const v2y = C.y - A.y;
    // get the unit distance along the line of the closest point to
    // circle center
    const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);
    
    
    // if the point is on the line segment get the distance squared
    // from that point to the circle center
    if(u >= 0 && u <= 1){
        dist  = (A.x + v1x * u - C.x) ** 2 + (A.y + v1y * u - C.y) ** 2;
    } else {
        // if closest point not on the line segment
        // use the unit distance to determine which end is closest
        // and get dist square to circle
        dist = u < 0 ?
                (A.x - C.x) ** 2 + (A.y - C.y) ** 2 :
                (B.x - C.x) ** 2 + (B.y - C.y) ** 2;
    }
    return dist < radius * radius;
}

function Vec2(x,y) {
    this.x=x;
    this.y=y;
    this.add = v => new Vec2(this.x+v.x, this.y+v.y);
    this.sub = v => new Vec2(this.x-v.x, this.y-v.y);
    this.len = () => Math.sqrt(this.x*this.x+this.y*this.y);
}


const fps = 20;

function Level(levelObject) {
    const currentLevel = JSON.parse(JSON.stringify(levelObject));
    const switchRadius = 20;
    doesCircleCollide = (position, radius) => {
        for (let i=0;i<currentLevel.walls.length;i++) {
            for (let j=1;j<currentLevel.walls[i].length;j++) {
                if (doesLineInterceptCircle(currentLevel.walls[i][j-1],currentLevel.walls[i][j], position, radius))
                    return true;
            }
        }
        for (let i=0;i<currentLevel.doors.length;i++) {
            for (let j=1;j<currentLevel.doors[i].polygon.length;j++) {
                if (!currentLevel.doors[i].open && doesLineInterceptCircle(currentLevel.doors[i].polygon[j-1],currentLevel.doors[i].polygon[j], position, radius))
                    return true;
            }
        }
        return false;
    }

    toggleDoor = doorName => {
        const door = currentLevel.doors.find(d => d.name == doorName);
        door.open = !door.open;
    }

    handleSwitches = (oldPos, newPos, radius) => {
        for(let s of currentLevel.switches) {
            const switchPos = new Vec2(s.x, s.y);
            const wasTouching = oldPos.sub(switchPos).len() < (radius + switchRadius);
            const nowTouching = newPos.sub(switchPos).len() < (radius + switchRadius);
            if (!wasTouching && nowTouching) {
                toggleDoor(s.target);
                s.pressed = true;
            }
            if (!nowTouching) {
                s.pressed = false;
            }
            if (wasTouching && !nowTouching && s.type == 'momentary') {
                toggleDoor(s.target);
            }
        }
    }
    this.interact = (oldPos, radius, plannedVector) => {
        const newPos = oldPos.add(plannedVector);

        if (doesCircleCollide(newPos, radius)) {
            return new Vec2(0,0);
        }

        handleSwitches(oldPos, newPos, radius);

        return plannedVector;
    }

    this.draw = () => {
        setColor('white');
        currentLevel.walls.forEach(drawPoly);

        setColor('purple');
        currentLevel.doors.filter(door => !door.open).forEach(door => drawPoly(door.polygon));

        setColor('yellow');
        currentLevel.switches.forEach(s => {
            drawCircle(s, switchRadius);
            if (s.pressed) {
                drawCircle(s, switchRadius-2);
            }
        });
    }
}

function Player({x,y}, level) {
    const speed = 100 / fps;
    const radius = 10;
    this.position = new Vec2(x,y);

    this.draw = () => {
        setColor('green');
        drawCircle(this.position, radius, true);
    }

    this.move = (buttons) => {
        const movement = new Vec2(0,0);

        if (buttons.up) {
            movement.y -= speed;
        }
        if (buttons.down) {
            movement.y += speed;
        }
        if (buttons.left) {
            movement.x -= speed;
        }
        if (buttons.right) {
            movement.x += speed;
        }

        this.position = this.position.add(
            level.interact(this.position, radius, movement)
        );
    }
}

const Game = function(levelObject) {
    let level;
    let player;
    let currentTick = 0;

    const buttons = {
        up:false,
        down:false,
        left:false,
        right:false
    }

    const draw = () => {
        camera = player.position;
        clearScreen();
        level.draw();
        player.draw();
    }

    const updateGame = () => {
        player.move(buttons);
    }

    this.tick = () => {
        draw();
        updateGame();
        ++currentTick;
    }

    this.buttonDown = key => buttons[key] = true;
    this.buttonUp = key => buttons[key] = false;

    this.loadLevel = (levelObject) => {
        level = new Level(levelObject);
        player = new Player(levelObject.start, level);
    }

    if (levelObject) {
        this.loadLevel(levelObject);
    }
}

const game = new Game(level1);

let previous;
let accumulator = 0; //stores incrementing value (in seconds) until the next frame, when it's then decremented by 1 frame's length
const update = time => {
    window.requestAnimationFrame(update);
    if (previous === undefined) { previous = time; }
    const dt = (time - previous) / 1000.0;
    accumulator += dt;
    if (accumulator > 1.0/fps) {
        accumulator - 1.0/fps;
        game.tick();
    }
    previous = time;
}
window.requestAnimationFrame(update);

const keyMap = {
    'ArrowUp': 'up',
    'KeyW': 'up',
    'ArrowDown': 'down',
    'KeyS': 'down',
    'ArrowLeft': 'left',
    'KeyA': 'left',
    'ArrowRight': 'right',
    'KeyD': 'right'
}
window.addEventListener('keydown', ev => {
    if (keyMap[ev.code]) {
        game.buttonDown(keyMap[ev.code])
    }
});
window.addEventListener('keyup', ev => {
    if (keyMap[ev.code]) {
        game.buttonUp(keyMap[ev.code])
    }
});