<script src="https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js"></script>
<script>
    // 调试函数 - 检查元素是否存在
    function debugElement(id) {
        const element = document.getElementById(id);
        return element;
    }

    window.addEventListener('load', function () {
        initPopup();
    });

    // 配置 marked.js
    function setupMarked() {
        marked.setOptions({
            breaks: true,         // 允许换行符转换为 <br>
            gfm: true,            // 支持 GitHub 风格的 Markdown
            headerIds: false,     // 不生成标题的 ID
            mangle: false,        // 不转义 HTML
            sanitize: false       // 不清理 HTML 标签
        });
    }

    // 从API获取公告内容
    async function fetchNoticeContent() {
        // 修改 GraphQL 查询，添加请求获取页面的更新时间
        const query = `
            {
                pages {
                    single(id: 15) {
                        content
                        updatedAt
                    }
                }
            }
        `;

        try {
            const response = await fetch('http://111.231.25.137:3000/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error('API请求失败');
            }

            const data = await response.json();

            // 提取返回数据中的内容和更新时间
            const content = data.data.pages.single.content;
            const updatedAt = data.data.pages.single.updatedAt;

            // 使用DOM解析返回的HTML内容
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const newElement = doc.getElementById('new');

            if (newElement) {
                // 返回内容和更新时间
                return {
                    content: newElement.innerHTML,
                    updatedAt: updatedAt
                };
            } else {
                console.error('未找到ID为new的元素');
                return {
                    content: '获取公告内容失败，请稍后再试',
                    updatedAt: new Date().toISOString() // 使用当前时间作为后备
                };
            }
        } catch (error) {
            console.error('获取公告时出错:', error);
            return {
                content: '获取公告内容失败，请稍后再试',
                updatedAt: new Date().toISOString() // 使用当前时间作为后备
            };
        }
    }

    // 将 HTML 转换为 Markdown 文本
    function extractMarkdownFromHtml(html) {
        // 简单的替换规则，可根据实际内容进行调整
        let markdown = html;

        // 处理标题
        markdown = markdown.replace(/<h([1-6])>(.*?)<\/h\1>/g, (match, level, content) => {
            return "#".repeat(level) + " " + content.trim() + "\n\n";
        });

        // 处理段落
        markdown = markdown.replace(/<p>(.*?)<\/p>/g, "$1\n\n");

        // 处理加粗
        markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, "**$1**");

        // 处理列表项
        markdown = markdown.replace(/<li>(.*?)<\/li>/g, "- $1\n");

        // 处理 blockquote
        markdown = markdown.replace(/<blockquote.*?>(.*?)<\/blockquote>/g, "> $1\n\n");

        // 移除其他 HTML 标签
        markdown = markdown.replace(/<[^>]*>/g, "");

        // 解码 HTML 实体
        markdown = markdown.replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, "\"")
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, " ");

        return markdown;
    }

    async function initPopup() {
        try {
            // 初始化 marked.js
            setupMarked();

            // 获取对话框元素
            const notice = debugElement('notice');
            const noticeContent = debugElement('notice-content');

            // 检查元素是否存在
            if (!notice || !noticeContent) {
                console.error('找不到必要的DOM元素');
                return;
            }

            // 从API获取公告内容和更新时间
            const { content, updatedAt } = await fetchNoticeContent();

            // 使用API返回的更新时间更新公告发布时间
            notice.setAttribute('data-publish-time', updatedAt);

            // 添加 markdown-content 类
            noticeContent.classList.add('markdown-content');

            try {
                // 直接使用 marked 解析内容，不再需要预处理
                noticeContent.innerHTML = marked.parse(content);

                // 为所有 blockquote 添加 is-info 类
                const blockquotes = noticeContent.querySelectorAll('blockquote');
                blockquotes.forEach(blockquote => {
                    // 直接添加 is-info 类到所有 blockquote
                    blockquote.classList.add('is-info');
                });
            } catch (e) {
                // 如果失败，尝试先将 HTML 转换为 Markdown 文本
                console.warn('直接解析失败，尝试转换为 Markdown:', e);

                const markdownText = extractMarkdownFromHtml(content);
                noticeContent.innerHTML = marked.parse(markdownText);

                // 为所有 blockquote 添加 is-info 类
                const blockquotes = noticeContent.querySelectorAll('blockquote');
                blockquotes.forEach(blockquote => {
                    blockquote.classList.add('is-info');
                });
            }

            // 获取更新后的发布时间
            const publishTime = notice.getAttribute('data-publish-time');

            // 简化的showModal方法，减少不必要的操作
            const originalShowModal = notice.showModal;
            notice.showModal = function () {
                originalShowModal.call(this);
                this.classList.add('animate-zoom');
                setTimeout(() => {
                    this.classList.remove('animate-zoom');
                }, 300);
            };

            // 打开对话框的元素
            const opener1 = debugElement('opener1');
            const closeIcon = debugElement('closeIcon');
            const closeBtn = debugElement('closeBtn');

            // 验证所有元素是否存在
            if (!opener1 || !closeIcon) {
                console.error('找不到操作按钮元素');
                return;
            }

            // Cookie 操作函数
            function getCookie(name) {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
                return null;
            }

            function setCookie(name, value, days) {
                let expires = "";
                if (days) {
                    const date = new Date();
                    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                    expires = "; expires=" + date.toUTCString();
                }
                document.cookie = name + "=" + value + expires + "; path=/";
            }

            // 检查是否需要显示公告
            function shouldShowNotice() {
                const lastSeenNotice = getCookie("lastSeenNotice");
                if (!lastSeenNotice || lastSeenNotice !== publishTime) {
                    return true;
                }
                return false;
            }

            // 记录用户已查看公告
            function markNoticeAsSeen() {
                setCookie("lastSeenNotice", publishTime, 30);
            }

            // 添加事件监听器 - 简化为只处理一个按钮
            opener1.addEventListener('click', function () {
                notice.showModal();
            });

            // 关闭弹窗按钮
            closeIcon.addEventListener('click', function () {
                notice.close();
                markNoticeAsSeen();
            });

            // 点击对话框背景关闭它
            notice.addEventListener('click', function (event) {
                if (event.target === notice) {
                    notice.close();
                    markNoticeAsSeen();
                }
            });

            // 自动检查并显示公告（如果需要）
            if (shouldShowNotice()) {
                // 使用requestAnimationFrame确保动画流畅
                requestAnimationFrame(function () {
                    setTimeout(function () {
                        notice.showModal();
                    }, 800);
                });
            }
        } catch (error) {
            console.error('初始化弹窗时发生错误:', error);
        }
    }
</script>
<script>
    // 调试函数 - 检查元素是否存在
    function debugElement(id) {
        const element = document.getElementById(id);
        return element;
    }

    window.addEventListener('load', function () {
        initPopup();
    });

    // 配置 marked.js
    function setupMarked() {
        marked.setOptions({
            breaks: true,         // 允许换行符转换为 <br>
            gfm: true,            // 支持 GitHub 风格的 Markdown
            headerIds: false,     // 不生成标题的 ID
            mangle: false,        // 不转义 HTML
            sanitize: false       // 不清理 HTML 标签
        });
    }

    // 从API获取公告内容
    async function fetchNoticeContent() {
        // 修改 GraphQL 查询，添加请求获取页面的更新时间
        const query = `
            {
                pages {
                    single(id: 143) {
                        content
                        updatedAt
                    }
                }
            }
        `;

        try {
            const response = await fetch('http://111.231.25.137:3000/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error('API请求失败');
            }

            const data = await response.json();

            // 提取返回数据中的内容和更新时间
            const content = data.data.pages.single.content;
            const updatedAt = data.data.pages.single.updatedAt;

            // 使用DOM解析返回的HTML内容
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const newElement = doc.getElementById('gameupdate');

            if (newElement) {
                // 返回内容和更新时间
                return {
                    content: newElement.innerHTML,
                    updatedAt: updatedAt
                };
            } else {
                console.error('未找到ID为gameupdate的元素');
                return {
                    content: '获取公告内容失败，请稍后再试',
                    updatedAt: new Date().toISOString() // 使用当前时间作为后备
                };
            }
        } catch (error) {
            console.error('获取公告时出错:', error);
            return {
                content: '获取公告内容失败，请稍后再试',
                updatedAt: new Date().toISOString() // 使用当前时间作为后备
            };
        }
    }

    // 将 HTML 转换为 Markdown 文本
    function extractMarkdownFromHtml(html) {
        // 简单的替换规则，可根据实际内容进行调整
        let markdown = html;

        // 处理标题
        markdown = markdown.replace(/<h([1-6])>(.*?)<\/h\1>/g, (match, level, content) => {
            return "#".repeat(level) + " " + content.trim() + "\n\n";
        });

        // 处理段落
        markdown = markdown.replace(/<p>(.*?)<\/p>/g, "$1\n\n");

        // 处理加粗
        markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, "**$1**");

        // 处理列表项
        markdown = markdown.replace(/<li>(.*?)<\/li>/g, "- $1\n");

        // 处理 blockquote
        markdown = markdown.replace(/<blockquote.*?>(.*?)<\/blockquote>/g, "> $1\n\n");

        // 移除其他 HTML 标签
        markdown = markdown.replace(/<[^>]*>/g, "");

        // 解码 HTML 实体
        markdown = markdown.replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, "\"")
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, " ");

        return markdown;
    }

    async function initPopup() {
        try {
            // 初始化 marked.js
            setupMarked();

            // 获取对话框元素
            const notice = debugElement('gameupdate');
            const noticeContent = debugElement('update-content');

            // 检查元素是否存在
            if (!notice || !noticeContent) {
                console.error('找不到必要的DOM元素');
                return;
            }

            // 从API获取公告内容和更新时间
            const { content, updatedAt } = await fetchNoticeContent();

            // 使用API返回的更新时间更新公告发布时间
            notice.setAttribute('data-publish-time', updatedAt);

            // 添加 markdown-content 类
            noticeContent.classList.add('markdown-content');

            try {
                // 直接使用 marked 解析内容，不再需要预处理
                noticeContent.innerHTML = marked.parse(content);

                // 为所有 blockquote 添加 is-info 类
                const blockquotes = noticeContent.querySelectorAll('blockquote');
                blockquotes.forEach(blockquote => {
                    // 直接添加 is-info 类到所有 blockquote
                    blockquote.classList.add('is-info');
                });
            } catch (e) {
                // 如果失败，尝试先将 HTML 转换为 Markdown 文本
                console.warn('直接解析失败，尝试转换为 Markdown:', e);

                const markdownText = extractMarkdownFromHtml(content);
                noticeContent.innerHTML = marked.parse(markdownText);

                // 为所有 blockquote 添加 is-info 类
                const blockquotes = noticeContent.querySelectorAll('blockquote');
                blockquotes.forEach(blockquote => {
                    blockquote.classList.add('is-info');
                });
            }

            // 获取更新后的发布时间
            const publishTime = notice.getAttribute('data-publish-time');

            // 简化的showModal方法，减少不必要的操作
            const originalShowModal = notice.showModal;
            notice.showModal = function () {
                originalShowModal.call(this);
                this.classList.add('animate-zoom');
                setTimeout(() => {
                    this.classList.remove('animate-zoom');
                }, 300);
            };

            // 打开对话框的元素
            const opener2 = debugElement('opener2');
            const closeIcon = debugElement('updatecloseIcon');

            // 验证所有元素是否存在
            if (!opener2 || !closeIcon) {
                console.error('找不到game操作按钮元素');
                return;
            }

            // Cookie 操作函数
            function getCookie(name) {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
                return null;
            }

            function setCookie(name, value, days) {
                let expires = "";
                if (days) {
                    const date = new Date();
                    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                    expires = "; expires=" + date.toUTCString();
                }
                document.cookie = name + "=" + value + expires + "; path=/";
            }

            // 检查是否需要显示公告
            function shouldShowNotice() {
                const lastSeenGameNotice = getCookie("lastSeenGameNotice");
                if (!lastSeenGameNotice || lastSeenGameNotice !== publishTime) {
                    return true;
                }
                return false;
            }

            // 记录用户已查看公告
            function markNoticeAsSeen() {
                setCookie("lastSeenGameNotice", publishTime, 30);
            }

            // 添加事件监听器 - 简化为只处理一个按钮
            opener2.addEventListener('click', function () {
                notice.showModal();
            });

            // 关闭弹窗按钮
            closeIcon.addEventListener('click', function () {
                notice.close();
                markNoticeAsSeen();
            });

            // 点击对话框背景关闭它
            notice.addEventListener('click', function (event) {
                if (event.target === notice) {
                    notice.close();
                    markNoticeAsSeen();
                }
            });

            // 自动检查并显示公告（如果需要）
            if (shouldShowNotice()) {
                // 使用requestAnimationFrame确保动画流畅
                requestAnimationFrame(function () {
                    setTimeout(function () {
                        notice.showModal();
                    }, 800);
                });
            }
        } catch (error) {
            console.error('初始化弹窗时发生错误:', error);
        }
    }
</script>