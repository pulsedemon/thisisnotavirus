import "./doors.scss";

class Doors {
  canvas: HTMLCanvasElement;
  doorHeight: number;
  doorWidth: number;
  ySpeed = 12;
  doors;
  opacity: 1;
  ctx;

  constructor(canvasId, width, color, speed, opacity, xPos) {
    const container = document.getElementById("container")!;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    this.canvas = document.createElement("canvas");
    this.canvas.id = canvasId;
    this.canvas.width = containerWidth;
    this.canvas.height = containerHeight;
    document.getElementById("container")?.appendChild(this.canvas);
    this.opacity = opacity;

    this.ySpeed = containerHeight / 80 + speed;

    this.doorHeight = this.canvas.height / 2;
    this.doorWidth = width;

    this.doors = {
      top: [
        {
          y: 0,
          x: xPos,
          direction: "up",
          color: color,
        },
      ],
      bottom: [
        {
          y: this.doorHeight,
          x: xPos,
          direction: "down",
          color: color,
        },
      ],
    };

    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.globalAlpha = this.opacity;

    this.updateDoors();
  }

  updateDoors() {
    this.doors.top.forEach((door) => {
      this.updateTopDoor(door);
    });

    this.doors.bottom.forEach((door) => {
      this.updateBottomDoor(door);
    });

    requestAnimationFrame(() => this.updateDoors());
  }

  updateTopDoor(door) {
    if (door.direction === "up" && door.y <= -this.doorHeight) {
      door.direction = "down";
    }
    if (door.direction === "down" && door.y >= 0) {
      door.direction = "up";
    }

    if (door.direction === "up") {
      door.y -= this.ySpeed;
    } else if (door.direction === "down") {
      door.y += this.ySpeed;
    }

    this.ctx.fillStyle = door.color;
    this.ctx.clearRect(door.x, 0, this.doorWidth, this.doorHeight);
    this.ctx.fillRect(door.x, door.y, this.doorWidth, this.doorHeight);
  }

  updateBottomDoor(door) {
    if (door.direction === "up" && door.y <= this.doorHeight) {
      door.direction = "down";
    }
    if (door.direction === "down" && door.y >= this.doorHeight * 2) {
      door.direction = "up";
    }

    if (door.direction === "up") {
      door.y -= this.ySpeed;
    } else if (door.direction === "down") {
      door.y += this.ySpeed;
    }

    this.ctx.fillStyle = door.color;
    this.ctx.clearRect(
      door.x,
      this.doorHeight,
      this.doorWidth,
      this.doorHeight
    );
    this.ctx.fillRect(door.x, door.y, this.doorWidth, this.doorHeight);
  }
}

const container = document.getElementById("container")!;
const width = container.clientWidth;

// new Doors("one", width, "black", 10, 1, 0);
// new Doors("one1", width, "black", 10, 1, 0);
// new Doors("three", width / 2, "red", 17, 0.8, 0);
// new Doors("four", width / 2, "coral", 15, 0.8, width / 2);

const numCols = container.clientWidth / 90;
const colors = ["white", "red", "green", "pink"];
for (let x = 0; x < numCols; x++) {
  const randomColor = colors[Math.random() * colors.length];
  new Doors(
    x,
    Math.ceil(width / numCols),
    randomColor,
    Math.random() * (15 - 10) + 10,
    1,
    Math.ceil(width / numCols) * x
  );
}

// new Doors("one", width, "black", 10, 1, 0);
// new Doors("two", width, "red", 14, 0.8, 0);
// new Doors("three", width / 2, "blue", 17, 0.8, 0);
// new Doors("four", width / 2, "coral", 15, 0.8, width / 2);
