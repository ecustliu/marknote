// 禁止 Windows 弹出控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    marknote_lib::run();
}
