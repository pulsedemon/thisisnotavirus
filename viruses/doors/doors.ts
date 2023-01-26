import "./doors.scss";

class Doors {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  doorHeight: number;
  topDoorDirection = "up";
  bottomDoorDirection = "down";
  topDoorY = 0;
  bottomDoorY = 0;
  ySpeed = 12;

  constructor() {
    this.container = document.getElementById("container")!;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    this.container.appendChild(this.canvas);

    this.doorHeight = this.canvas.clientHeight / 2;
    this.bottomDoorY = this.doorHeight;

    this.updateDoors();
  }

  updateDoors() {
    this.updateTopDoor();
    this.updateBottomDoor();

    requestAnimationFrame(() => this.updateDoors());
  }

  updateTopDoor() {
    if (this.topDoorDirection === "up" && this.topDoorY <= -this.doorHeight) {
      this.topDoorDirection = "down";
    }
    if (this.topDoorDirection === "down" && this.topDoorY >= 0) {
      this.topDoorDirection = "up";
    }

    if (this.topDoorDirection === "up") {
      this.topDoorY -= this.ySpeed;
    } else if (this.topDoorDirection === "down") {
      this.topDoorY += this.ySpeed;
    }

    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = "black";
    ctx.clearRect(0, 0, this.canvas.clientWidth, this.doorHeight);
    ctx.fillRect(0, this.topDoorY, this.canvas.clientWidth, this.doorHeight);
  }

  updateBottomDoor() {
    if (
      this.bottomDoorDirection === "up" &&
      this.bottomDoorY <= this.doorHeight
    ) {
      this.bottomDoorDirection = "down";
    }
    if (
      this.bottomDoorDirection === "down" &&
      this.bottomDoorY >= this.doorHeight * 2
    ) {
      this.bottomDoorDirection = "up";
    }

    if (this.bottomDoorDirection === "up") {
      this.bottomDoorY -= this.ySpeed;
    } else if (this.bottomDoorDirection === "down") {
      this.bottomDoorY += this.ySpeed;
    }

    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = "black";
    ctx.clearRect(0, this.doorHeight, this.canvas.clientWidth, this.doorHeight);
    ctx.fillRect(0, this.bottomDoorY, this.canvas.clientWidth, this.doorHeight);
  }
}

new Doors();
