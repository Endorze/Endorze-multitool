use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ActiveWindowInfo {
    pub app_name: String,
    pub process_path: String,
    pub window_title: String,
    pub pid: u32,
}

#[tauri::command]
pub fn get_active_window() -> Result<ActiveWindowInfo, String> {
    get_active_window_platform()
}

#[cfg(target_os = "windows")]
fn get_active_window_platform() -> Result<ActiveWindowInfo, String> {
    use std::path::PathBuf;
    use std::ptr::null_mut;
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::ProcessStatus::K32GetModuleFileNameExW;
    use windows::Win32::System::Threading::{
        OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW,
        GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd = GetForegroundWindow();

        if hwnd.0 == null_mut() {
            return Err("No active foreground window found.".to_string());
        }

        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        if pid == 0 {
            return Err("Could not read active process id.".to_string());
        }

        let process_handle = OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            false,
            pid,
        )
        .map_err(|error| format!("Could not open process: {error}"))?;

        let mut path_buffer = vec![0u16; 2048];

        let path_len = K32GetModuleFileNameExW(
            process_handle,
            None,
            &mut path_buffer,
        );

        let _ = CloseHandle(process_handle);

        let process_path = if path_len > 0 {
            String::from_utf16_lossy(&path_buffer[..path_len as usize])
        } else {
            String::from("Unknown")
        };

        let app_name = PathBuf::from(&process_path)
            .file_stem()
            .and_then(|name| name.to_str())
            .unwrap_or("Unknown")
            .to_string();

        let title_length = GetWindowTextLengthW(hwnd);
        let mut title_buffer = vec![0u16; title_length as usize + 1];

        let copied = GetWindowTextW(hwnd, &mut title_buffer);

        let window_title = if copied > 0 {
            String::from_utf16_lossy(&title_buffer[..copied as usize])
        } else {
            String::new()
        };

        Ok(ActiveWindowInfo {
            app_name,
            process_path,
            window_title,
            pid,
        })
    }
}

#[cfg(not(target_os = "windows"))]
fn get_active_window_platform() -> Result<ActiveWindowInfo, String> {
    Err("Active window tracking is currently only implemented for Windows.".to_string())
}