use serde::Serialize;
use std::process::Command;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct ExtractedAudio {
    pub file_name: String,
    pub relative_path: String,
}

#[tauri::command]
pub async fn extract_audio_from_url(
    app: AppHandle,
    url: String,
) -> Result<ExtractedAudio, String> {
    let trimmed_url = url.trim();

    if trimmed_url.is_empty() {
        return Err("Please enter a video URL.".to_string());
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not find app data folder: {error}"))?;

    let music_dir = app_data_dir.join("music");

    std::fs::create_dir_all(&music_dir)
        .map_err(|error| format!("Could not create music folder: {error}"))?;

    let output_template = music_dir.join("%(title).120s-%(id)s.%(ext)s");

    let output = Command::new("yt-dlp")
        .arg("-x")
        .arg("--audio-format")
        .arg("mp3")
        .arg("--audio-quality")
        .arg("192K")
        .arg("--restrict-filenames")
        .arg("--print")
        .arg("after_move:filepath")
        .arg("-o")
        .arg(output_template.to_string_lossy().to_string())
        .arg(trimmed_url)
        .output()
        .map_err(|_| {
            "Could not run yt-dlp. Make sure yt-dlp and ffmpeg are installed and available in PATH."
                .to_string()
        })?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(if error.trim().is_empty() {
            "Audio extraction failed.".to_string()
        } else {
            error
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let extracted_path = stdout
        .lines()
        .last()
        .ok_or("Could not find extracted file path.")?
        .trim()
        .to_string();

    let extracted_file = std::path::PathBuf::from(&extracted_path);

    let file_name = extracted_file
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("Extracted audio")
        .to_string();

    let saved_file_name = extracted_file
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("Could not read saved audio file name.")?
        .to_string();

    Ok(ExtractedAudio {
        file_name,
        relative_path: format!("music/{saved_file_name}"),
    })
}