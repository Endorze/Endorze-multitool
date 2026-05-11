mod diagnostics;
mod audio_extractor;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            diagnostics::get_active_window,
            audio_extractor::extract_audio_from_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}