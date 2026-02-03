# Domain Switcher

A minimal PWA that automatically detects domain availability and switches to backup domains when the current one is blocked.

## How It Works

1. **PWA Mode**: When launched from home screen, auto-checks domain availability
2. **Domain Detection**: Tests if current domain is accessible (3s timeout)
3. **Auto-Switch**: If blocked, automatically redirects to first available backup domain
4. **Offline Cache**: Caches `domains.json` so switching works even when network is down

## Architecture

- **Frontend**: Vanilla HTML/JS, dark minimalist UI
- **Service Worker**: Handles caching and background domain checking
- **Config**: Simple array in `domains.json`

## Usage

### User Flow
```
Visit a.com → Install PWA → Open from home screen → Auto-redirects if blocked
```

### Admin Flow
```
Deploy to multiple domains → Edit domains.json → Access /test.html to verify
```

## Configuration

Edit `domains.json`:
```json
[
  "primary-domain.com",
  "backup-1.com", 
  "backup-2.com"
]
```

First domain is primary, others are backups tested in order.

## Deployment

### Vercel
```bash
vercel --prod
```

### Local Test
```bash
python -m http.server 8080
# Visit http://localhost:8080/test.html
```

## Pages

- `/` - Main page (shows current domain, auto-switches in PWA mode)
- `/test.html` - Diagnostic tool (manual domain check, install button, logs)

---

# 域名切换器

极简 PWA，自动检测域名可用性，当前域名被封禁时自动切换到备用域名。

## 工作原理

1. **PWA 模式**: 从主屏幕打开时自动检测域名可用性
2. **域名检测**: 测试当前域名是否可访问（3秒超时）
3. **自动切换**: 如果被封锁，自动跳转到第一个可用的备用域名
4. **离线缓存**: 缓存 `domains.json`，即使网络中断也能切换

## 架构

- **前端**: 原生 HTML/JS，深色极简界面
- **Service Worker**: 处理缓存和后台域名检测
- **配置**: `domains.json` 中的简单数组

## 使用方法

### 用户流程
```
访问 a.com → 安装 PWA → 从主屏幕打开 → 如果被封锁自动跳转
```

### 管理员流程
```
部署到多个域名 → 编辑 domains.json → 访问 /test.html 验证
```

## 配置

编辑 `domains.json`:
```json
[
  "主域名.com",
  "备用-1.com",
  "备用-2.com"
]
```

第一个域名是主域名，其他按顺序作为备用。

## 部署

### Vercel
```bash
vercel --prod
```

### 本地测试
```bash
python -m http.server 8080
# 访问 http://localhost:8080/test.html
```

## 页面

- `/` - 首页（显示当前域名，PWA 模式下自动切换）
- `/test.html` - 诊断工具（手动检测域名、安装按钮、日志）
