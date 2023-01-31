import "./doors.scss";
import UAParser from "ua-parser-js";
import { randomNumberBetween } from "../../util";

const usparser = new UAParser();
const isMobile = usparser.getResult().device.type === "mobile" ? true : false;

interface DoorConfig {
  y: number;
  x: number;
  direction: string;
  color: string;
}

interface DoorsConfig {
  top: DoorConfig[];
  bottom: DoorConfig[];
}

class Doors {
  canvas: HTMLCanvasElement;
  doorHeight: number;
  doorWidth: number;
  ySpeed = 12;
  doors: DoorsConfig;
  opacity = 1;
  ctx: CanvasRenderingContext2D;

  constructor(
    width: number,
    color: string,
    speed: number,
    opacity: number,
    xPos: number
  ) {
    const container = document.getElementById("container")!;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    this.canvas = document.createElement("canvas");
    this.canvas.width = containerWidth;
    this.canvas.height = containerHeight;
    document.getElementById("container")?.appendChild(this.canvas);
    this.opacity = opacity;
    this.ySpeed = speed;
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
      requestAnimationFrame(() => {
        this.updateTopDoor(door);
      });
    });

    this.doors.bottom.forEach((door) => {
      requestAnimationFrame(() => {
        this.updateBottomDoor(door);
      });
    });

    requestAnimationFrame(() => this.updateDoors());
  }

  updateTopDoor(door: DoorConfig) {
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

  updateBottomDoor(door: DoorConfig) {
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
const numCols = Math.round(container.clientWidth / (isMobile ? 50 : 30));
const colorPalettes = [
  {
    bg: "#00ffff",
    doors: ["#79FDF8", "#01EDF3", "#04CDFE", "#2367FB", "#5B32FC"],
  },
  {
    bg: "#FF0000",
    doors: ["#482082", "#214EE9", "#7984FF", "#EA00A2", "#FF0053"],
  },
  {
    bg: "#440c46",
    doors: ["#440c46", "#3a093c", "#2f0631", "#250327", "#1a001c"],
  },
];
let colorPalette =
  colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
const minSpeed = isMobile ? 20 : 10;
const maxSpeed = isMobile ? 30 : 15;

document.body.style.backgroundColor = colorPalette.bg;
for (let x = 0; x < numCols; x++) {
  new Doors(
    Math.round(width / numCols),
    colorPalette.doors[0],
    randomNumberBetween(minSpeed, maxSpeed),
    1,
    Math.round(width / numCols) * x
  );
  colorPalette.doors.push(colorPalette.doors.shift()!);
}
