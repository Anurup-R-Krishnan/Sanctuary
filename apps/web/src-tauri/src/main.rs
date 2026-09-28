#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    AppHandle, Emitter, Manager, State,
};
use tauri_plugin_fs::FsExt;

const BOOK_EXTENSIONS: [&str; 9] = ["epub", "mobi", "azw3", "fb2", "cbz", "txt", "md", "html", "pdf"];

/// Book files passed on the command line (file-manager "Open with"), at
/// launch or forwarded from a second instance. The webview drains this queue
/// with `take_launch_files` when it is ready and whenever it receives the
/// `open-files` nudge, so no file is lost to a startup race.
struct LaunchFiles(Mutex<Vec<String>>);

#[tauri::command]
fn take_launch_files(state: State<LaunchFiles>) -> Vec<String> {
    std::mem::take(&mut *state.0.lock().unwrap())
}

fn book_paths(args: impl Iterator<Item = String>, cwd: &Path) -> Vec<PathBuf> {
    args.map(|arg| cwd.join(arg))
        .filter(|path| {
            path.extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| BOOK_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
                .unwrap_or(false)
        })
        .filter_map(|path| path.canonicalize().ok())
        .collect()
}

/// Adds book paths to the fs scope so the webview may read exactly those files.
fn allow_books(app: &AppHandle, paths: Vec<PathBuf>) -> Vec<String> {
    let scope = app.fs_scope();
    paths
        .into_iter()
        .filter(|path| scope.allow_file(path).is_ok())
        .map(|path| path.to_string_lossy().into_owned())
        .collect()
}

fn main() {
    tauri::Builder::default()
        // Must be registered first: a second launch ("Open with" while running)
        // forwards its files here instead of starting another window.
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            let files = allow_books(app, book_paths(argv.into_iter().skip(1), Path::new(&cwd)));
            if !files.is_empty() {
                if let Some(queue) = app.try_state::<LaunchFiles>() {
                    queue.0.lock().unwrap().extend(files);
                }
                let _ = app.emit("open-files", ());
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![take_launch_files])
        .setup(|app| {
            let file_menu = SubmenuBuilder::new(app, "File")
                .text("add-book", "Add Book…")
                .separator()
                .close_window()
                .build()?;
            let menu = MenuBuilder::new(app).item(&file_menu).build()?;
            app.set_menu(menu)?;

            let cwd = std::env::current_dir().unwrap_or_default();
            let launch_files = allow_books(app.handle(), book_paths(std::env::args().skip(1), &cwd));
            app.manage(LaunchFiles(Mutex::new(launch_files)));

            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id() == "add-book" {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.eval("window.dispatchEvent(new Event('sanctuary:add-book'))");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Sanctuary desktop application");
}
