import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
  try {
    const { videoPath, styleId, outputFileName, brolls } = await req.json();

    if (!videoPath || !styleId) {
      return NextResponse.json({ error: "Missing videoPath or styleId" }, { status: 400 });
    }

    const outputPath = `C:/Users/Rishika/hyper-captions-engine/outputs/${outputFileName || "rendered_video.mp4"}`;

    // Command to run the Python render pipeline
    // We pass the paths as arguments to the script
    const command = `python "C:/Users/Rishika/hyper-captions-engine/render_pipeline.py" --video "${videoPath}" --style "${styleId}" --output "${outputPath}" --brolls '${JSON.stringify(brolls || [])}'`;

    console.log(`🚀 Triggering Hyperframes Render: ${command}`);

    // In a production app, we would use a task queue like Celery or BullMQ
    // because rendering takes time. For now, we run it directly.
    const { stdout, stderr } = await execPromise(command);

    if (stderr && !stdout) {
      console.error(`Render Error: ${stderr}`);
      return NextResponse.json({ error: stderr }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Render completed successfully",
      path: outputPath,
      log: stdout
    });

  } catch (error: any) {
    console.error("API Render Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
