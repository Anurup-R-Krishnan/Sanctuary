#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    Manager,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let file_menu = SubmenuBuilder::new(app, "File")
                .text("add-book", "Add EPUB…")
                .separator()
                .close_window()
                .build()?;
            let menu = MenuBuilder::new(app).item(&file_menu).build()?;
            app.set_menu(menu)?;
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
