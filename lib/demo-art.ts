function paintTiles(
  context: CanvasRenderingContext2D,
  kind: "before" | "after",
) {
  const tile = 90;
  for (let y = 70; y < 760; y += tile) {
    for (let x = 30; x < 1170; x += tile) {
      context.fillStyle = kind === "before" ? "#c9bbaa" : "#f6f2ea";
      context.fillRect(x + 4, y + 4, tile - 8, tile - 8);
      context.strokeStyle = kind === "before" ? "#8f8172" : "#e3d9cc";
      context.lineWidth = 2;
      context.strokeRect(x + 4, y + 4, tile - 8, tile - 8);
    }
  }
}

export function paintDemoPhoto(kind: "before" | "after"): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("Could not draw the sample photo."));

  context.fillStyle = kind === "before" ? "#ddd4c8" : "#f3efe7";
  context.fillRect(0, 0, 1200, 900);
  paintTiles(context, kind);

  context.fillStyle = "#f7f7f5";
  context.fillRect(360, 640, 480, 200);
  context.strokeStyle = "#c8c2b8";
  context.lineWidth = 8;
  context.strokeRect(360, 640, 480, 200);

  context.strokeStyle = "#7d868e";
  context.lineWidth = 12;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(600, 640);
  context.lineTo(600, 560);
  context.lineTo(710, 560);
  context.stroke();

  if (kind === "before") {
    context.strokeStyle = "#6a5142";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(160, 180);
    context.lineTo(310, 340);
    context.lineTo(250, 520);
    context.stroke();
    context.fillStyle = "rgba(92, 68, 48, 0.28)";
    context.beginPath();
    context.ellipse(250, 280, 78, 42, 0.5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(70, 60, 50, 0.18)";
    context.fillRect(820, 160, 70, 70);
  } else {
    context.strokeStyle = "#efe8dc";
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(372, 648);
    context.lineTo(828, 648);
    context.stroke();
    context.fillStyle = "#1f5c45";
    context.fillRect(80, 80, 18, 70);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not save the sample photo."));
        else resolve(blob);
      },
      "image/jpeg",
      0.86,
    );
  });
}
