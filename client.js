window.__ModuleLoader__.load({
	id: "dsh-plug-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const h = React.createElement;

		const CSS = [
			".pm-root{display:flex;flex-direction:column;gap:16px;padding:20px;max-width:980px;margin:0 auto;color:var(--dsw-alias-label-primary,#111);font-size:13px;line-height:1.5;}",
			".pm-tabs{display:flex;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l1,#ddd);}",
			".pm-tab{padding:8px 14px;border:1px solid transparent;border-bottom:none;background:transparent;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;border-radius:8px 8px 0 0;font-size:13px;}",
			".pm-tab.active{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111);border-color:var(--dsw-alias-border-l1,#ddd);}",
			".pm-toolbar{display:flex;gap:8px;flex-wrap:wrap;}",
			".pm-input{flex:1;min-width:180px;padding:7px 10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111);font-size:13px;outline:none;}",
			".pm-input:focus{border-color:var(--dsw-alias-brand-primary,#4a6cf7);}",
			".pm-select{padding:7px 10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111);font-size:13px;}",
			".pm-btn{padding:6px 12px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111);cursor:pointer;font-size:12px;white-space:nowrap;text-decoration:none;display:inline-block;}",
			".pm-btn:hover{border-color:var(--dsw-alias-border-l2,#bbb);}",
			".pm-btn.primary{background:var(--dsw-alias-bg-base,#fff);border-color:var(--dsw-alias-border-l2,#bbb);color:var(--dsw-alias-label-primary,#111);font-weight:600;}",
			".pm-btn.primary:hover{border-color:var(--dsw-alias-label-primary,#111);}",
			".pm-btn.danger{color:var(--dsw-alias-state-error-primary,#d33);}",
			".pm-btn:disabled{opacity:.5;cursor:default;}",
			".pm-btn:active:not(:disabled){transform:translateY(1px);}",
			".pm-name:hover{text-decoration:underline;}",
			".pm-name:active{opacity:.6;}",
			".pm-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;}",
			".pm-card{border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);padding:14px;display:flex;flex-direction:column;gap:8px;}",
			".pm-card-head{display:flex;gap:10px;align-items:center;}",
			".pm-avatar{width:28px;height:28px;border-radius:50%;background:var(--dsw-alias-bg-layer-2,#f2f2f2);flex:none;}",
			".pm-avatar.letter{display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;color:var(--dsw-alias-brand-primary,#4a6cf7);}",
			".pm-name{font-weight:600;color:var(--dsw-alias-brand-primary,#4a6cf7);cursor:pointer;word-break:break-all;}",
			".pm-desc{color:var(--dsw-alias-label-secondary,#666);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.9em;}",
			".pm-meta{display:flex;gap:12px;color:var(--dsw-alias-label-secondary,#666);font-size:12px;flex-wrap:wrap;}",
			".pm-actions{display:flex;gap:8px;margin-top:auto;flex-wrap:wrap;}",
			".pm-note{padding:10px 12px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f7f7f7);color:var(--dsw-alias-label-secondary,#555);display:flex;flex-direction:column;gap:8px;}",
			".pm-job{border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);padding:10px 12px;display:flex;flex-direction:column;gap:8px;}",
			".pm-output{margin:0;background:var(--dsw-alias-bg-layer-2,#f7f7f7);border:1px solid var(--dsw-alias-border-l1,#eee);border-radius:8px;padding:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.5;max-height:240px;overflow:auto;white-space:pre-wrap;word-break:break-all;}",
			".pm-error{color:var(--dsw-alias-state-error-primary,#d33);}",
			".pm-ok{color:var(--dsw-alias-state-success-primary,#2a9d4a);}",
			".pm-warn{color:var(--dsw-alias-state-warn-primary,#c8860a);}",
			".pm-detail{display:flex;flex-direction:column;gap:12px;}",
			".pm-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:900;display:flex;align-items:flex-start;justify-content:center;padding:4vh 16px;animation:pm-fade .18s ease-out;}",
			".pm-modal{width:min(880px,100%);max-height:92vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.28);animation:pm-pop .22s ease-out;}",
			".pm-modal-body{overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;}",
			"@keyframes pm-fade{from{opacity:0}to{opacity:1}}",
			"@keyframes pm-pop{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}",
			".pm-restart-overlay{position:fixed;inset:0;background:var(--dsw-alias-bg-base,#fff);z-index:1000;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;color:var(--dsw-alias-label-primary,#111);font-size:14px;text-align:center;padding:20px;}",
			".pm-spin{width:34px;height:34px;border-radius:50%;border:3px solid var(--dsw-alias-border-l2,#bbb);border-top-color:var(--dsw-alias-label-primary,#111);animation:pm-rotate .9s linear infinite;}",
			"@keyframes pm-rotate{to{transform:rotate(360deg)}}",
			".pm-facts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}",
			".pm-badge{padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1,#ddd);font-size:11px;color:var(--dsw-alias-label-secondary,#666);background:var(--dsw-alias-bg-layer-2,#f7f7f7);}",
			".pm-badge.good{color:var(--dsw-alias-state-success-primary,#2a9d4a);border-color:currentColor;}",
			".pm-badge.bad{color:var(--dsw-alias-state-error-primary,#d33);border-color:currentColor;}",
			".pm-readme{max-height:min(62vh,640px);overflow:auto;background:var(--dsw-alias-bg-layer-2,#f7f7f7);border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:8px;padding:14px;}",
			".pm-html{display:flex;flex-direction:column;gap:8px;}",
			".pm-html img,.pm-md img{max-width:100%;}",
			".pm-md{line-height:1.65;word-break:break-word;font-size:13px;color:var(--dsw-alias-label-primary,#222);}",
			".pm-md h1{font-size:1.35em;margin:.6em 0 .4em;padding-bottom:.25em;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e5e5);}",
			".pm-md h2{font-size:1.2em;margin:.7em 0 .4em;padding-bottom:.2em;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e5e5);}",
			".pm-md h3{font-size:1.08em;margin:.6em 0 .3em;}",
			".pm-md h4,.pm-md h5,.pm-md h6{font-size:1em;margin:.5em 0 .3em;color:var(--dsw-alias-label-secondary,#555);}",
			".pm-md p{margin:.45em 0;}",
			".pm-md a{color:var(--dsw-alias-brand-primary,#4a6cf7);text-decoration:none;}",
			".pm-md a:hover{text-decoration:underline;}",
			".pm-md code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e5e5);border-radius:4px;padding:.08em .35em;}",
			".pm-md pre{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e5e5);border-radius:8px;padding:10px;overflow:auto;margin:.5em 0;}",
			".pm-md pre code{background:transparent;border:none;padding:0;font-size:11px;white-space:pre;}",
			".pm-md blockquote{margin:.5em 0;padding:.2em .8em;border-left:3px solid var(--dsw-alias-border-l2,#ccc);color:var(--dsw-alias-label-secondary,#666);}",
			".pm-md ul,.pm-md ol{margin:.4em 0;padding-left:1.6em;}",
			".pm-md li{margin:.15em 0;}",
			".pm-md img{max-width:100%;border-radius:6px;margin:.2em 0;}",
			".pm-md hr{border:none;border-top:1px solid var(--dsw-alias-border-l1,#e5e5e5);margin:1em 0;}",
			".pm-md-table{border-collapse:collapse;margin:.6em 0;font-size:12px;display:block;overflow-x:auto;max-width:100%;}",
			".pm-md-table th,.pm-md-table td{border:1px solid var(--dsw-alias-border-l1,#ddd);padding:4px 10px;}",
			".pm-md-table th{background:var(--dsw-alias-bg-layer-1,#fff);}",
			".pm-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}",
			".pm-profile-card{border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);padding:14px;display:flex;flex-direction:column;gap:10px;}",
						".pm-spacer{flex:1;}",
			".pm-muted{color:var(--dsw-alias-label-secondary,#777);font-size:12px;}",
			".pm-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;background:var(--dsw-alias-bg-layer-2,#f7f7f7);border:1px solid var(--dsw-alias-border-l1,#eee);border-radius:6px;padding:2px 6px;word-break:break-all;}",
		].join("\n");

		function rpc(path, params) {
			const entries = [];
			if (params) {
				for (const key of Object.keys(params)) {
					const value = params[key];
					if (value === undefined || value === null || value === "") continue;
					entries.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
				}
			}
			const url = "/plug-mgr/" + path + (entries.length > 0 ? "?" + entries.join("&") : "");
			return fetch(url, { headers: { accept: "application/json" } }).then((res) => {
				if (!res.ok) return { ok: false, error: "请求 /plug-mgr/" + path + " 返回 HTTP " + res.status };
				return res.json();
			});
		}

		function errMsg(error) {
			if (error === null || error === undefined) return "未知错误";
			if (typeof error === "string") return error;
			if (typeof error.message === "string") return error.message;
			return String(error);
		}

		// ------------------------------------------------------- Markdown 渲染
		// 迷你 Markdown → React 元素渲染器：不插入任何原始 HTML，文本一律经
		// React 转义，链接只放行 http(s)/锚点，因此 README 中的恶意内容无法
		// 注入脚本。支持：标题、围栏代码块、行内代码、粗/斜/删除线、链接、
		// 图片（相对路径自动改写为 raw.githubusercontent.com）、有序/无序列表
		// （含嵌套）、引用、表格、分隔线。
		const MD_HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
		const MD_HR_RE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
		const MD_FENCE_RE = /^(`{3,}|~{3,})\s*([A-Za-z0-9_+#.-]*)\s*$/;
		const MD_LIST_RE = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
		const MD_QUOTE_RE = /^ {0,3}>\s?(.*)$/;
		const MD_TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}[^\s|]*\s*(\|\s*:?-{2,}[^\s|]*\s*)*\|?\s*$/;

		function mdSafeUrl(url) {
			if (typeof url !== "string") return null;
			const u = url.trim();
			if (/^https?:\/\//i.test(u)) return u;
			if (u.startsWith("#")) return u;
			return null;
		}

		function mdSplitTableRow(line) {
			let t = line.trim();
			if (t.startsWith("|")) t = t.slice(1);
			if (t.endsWith("|")) t = t.slice(0, -1);
			return t.split("|").map((c) => c.trim());
		}

		// ---- README 中的 HTML：DOMParser 解析 + 白名单净化后转 React 元素 ----
		const HTML_DROP_TAGS = { script: 1, style: 1, iframe: 1, frame: 1, frameset: 1, object: 1, embed: 1, link: 1, meta: 1, base: 1, form: 1, input: 1, textarea: 1, select: 1, button: 1, svg: 1, math: 1, template: 1, title: 1, noscript: 1, applet: 1, area: 1, map: 1 };
		const HTML_ALLOWED_TAGS = { a: 1, abbr: 1, b: 1, blockquote: 1, br: 1, caption: 1, center: 1, code: 1, dd: 1, del: 1, details: 1, div: 1, dl: 1, dt: 1, em: 1, figcaption: 1, figure: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, hr: 1, i: 1, img: 1, ins: 1, kbd: 1, li: 1, mark: 1, ol: 1, p: 1, picture: 1, pre: 1, q: 1, s: 1, samp: 1, small: 1, source: 1, span: 1, strike: 1, strong: 1, sub: 1, summary: 1, sup: 1, table: 1, tbody: 1, td: 1, tfoot: 1, th: 1, thead: 1, tr: 1, u: 1, ul: 1, var: 1 };
		const HTML_VOID_TAGS = { br: 1, hr: 1, img: 1, source: 1 };
		const HTML_ALLOWED_ATTRS = { align: 1, alt: 1, colspan: 1, height: 1, rowspan: 1, start: 1, title: 1, valign: 1, width: 1 };
		const HTML_BLOCK_START_RE = /^\s*<(div|p|table|ul|ol|dl|blockquote|pre|figure|details|section|article|picture|center|summary|nav|header|footer|aside|main|h[1-6]|hr|br|img)([\s/>]|$)/i;

		function domNodeToReact(node, key, resolveImage) {
			if (node.nodeType === 3) {
				const text = node.nodeValue.replace(/\s+/g, " ");
				if (text === "" || text === " ") return null;
				return mdInline(text, key, resolveImage);
			}
			if (node.nodeType !== 1) return null;
			const tag = node.tagName.toLowerCase();
			if (HTML_DROP_TAGS[tag] === 1) return null;
			if (HTML_ALLOWED_TAGS[tag] !== 1) return domChildrenToReact(node, key, resolveImage);
			const props = { key };
			for (let ai = 0; ai < node.attributes.length; ai++) {
				const attr = node.attributes[ai];
				const name = attr.name.toLowerCase();
				const value = attr.value;
				if (typeof value !== "string" || value.length > 2000) continue;
				if (name === "href") {
					const u = mdSafeUrl(value);
					if (u !== null) props.href = u;
				} else if (name === "src") {
					const u = resolveImage(value);
					if (u !== null) props.src = u;
				} else if (HTML_ALLOWED_ATTRS[name] === 1 && value.length <= 200) {
					props[name] = value;
				}
			}
			if (tag === "a") {
				if (props.href === undefined) return domChildrenToReact(node, key, resolveImage);
				props.target = "_blank";
				props.rel = "noreferrer noopener";
			}
			if (tag === "img") {
				if (props.src === undefined) return null;
				props.loading = "lazy";
				return h("img", props);
			}
			if (HTML_VOID_TAGS[tag] === 1) return h(tag, props);
			return h(tag, props, domChildrenToReact(node, key, resolveImage));
		}
		function domChildrenToReact(parent, keyBase, resolveImage) {
			const out = [];
			for (let ni = 0; ni < parent.childNodes.length; ni++) {
				const converted = domNodeToReact(parent.childNodes[ni], keyBase + "-" + ni, resolveImage);
				if (converted !== null) out.push(converted);
			}
			return out;
		}
		function renderHtmlChunk(html, keyBase, resolveImage) {
			try {
				const doc = new DOMParser().parseFromString(html, "text/html");
				return domChildrenToReact(doc.body, keyBase, resolveImage);
			} catch (e) {
				return [html];
			}
		}

		function mdInline(text, keyBase, resolveImage) {
			const patterns = [
				{ re: /`([^`]+)`/, type: "code" },
				{ re: /\[!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/, type: "imglink" },
				{ re: /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/, type: "img" },
				{ re: /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/, type: "link" },
				{ re: /\*\*([\s\S]+?)\*\*/, type: "bold" },
				{ re: /__([\s\S]+?)__/, type: "bold" },
				{ re: /~~([\s\S]+?)~~/, type: "strike" },
				{ re: /\*([^*\n]+)\*/, type: "italic" },
				{ re: /(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/, type: "italic2" },
				{ re: /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]*)?\s*\/?>/, type: "html" },
			];
			const nodes = [];
			let rest = text;
			let k = 0;
			while (rest.length > 0) {
				let best = null;
				for (const p of patterns) {
					const m = p.re.exec(rest);
					if (m !== null && (best === null || m.index < best.m.index || (m.index === best.m.index && m[0].length > best.m[0].length))) {
						best = { p, m };
					}
				}
				if (best === null) { nodes.push(rest); break; }
				const p = best.p;
				const m = best.m;
				if (m.index > 0) nodes.push(rest.slice(0, m.index));
				const kk = keyBase + "-" + (k++);
				let extraSkip = 0;
				if (p.type === "code") {
					nodes.push(h("code", { key: kk }, m[1]));
				} else if (p.type === "imglink") {
					const imgSrc = resolveImage(m[2]);
					const href = mdSafeUrl(m[3]);
					if (imgSrc !== null && href !== null) {
						nodes.push(h("a", { key: kk, href, target: "_blank", rel: "noreferrer noopener" }, h("img", { src: imgSrc, alt: m[1], loading: "lazy" })));
					} else if (imgSrc !== null) {
						nodes.push(h("img", { key: kk, src: imgSrc, alt: m[1], loading: "lazy" }));
					} else {
						nodes.push(m[1] !== "" ? m[1] : m[0]);
					}
				} else if (p.type === "img") {
					const src = resolveImage(m[2]);
					if (src !== null) nodes.push(h("img", { key: kk, src, alt: m[1], loading: "lazy" }));
					else nodes.push(m[1] !== "" ? m[1] : m[0]);
				} else if (p.type === "link") {
					const href = mdSafeUrl(m[2]);
					if (href !== null) nodes.push(h("a", { key: kk, href, target: "_blank", rel: "noreferrer noopener" }, mdInline(m[1], kk, resolveImage)));
					else nodes.push(m[1]);
				} else if (p.type === "bold") {
					nodes.push(h("strong", { key: kk }, mdInline(m[1], kk, resolveImage)));
				} else if (p.type === "strike") {
					nodes.push(h("del", { key: kk }, mdInline(m[1], kk, resolveImage)));
				} else if (p.type === "italic") {
					nodes.push(h("em", { key: kk }, mdInline(m[1], kk, resolveImage)));
				} else if (p.type === "html") {
					const tagNameMatch = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)/.exec(m[0]);
					const tagName = tagNameMatch !== null ? tagNameMatch[1].toLowerCase() : "";
					const isClosing = m[0].charAt(0) === "<" && m[0].charAt(1) === "/";
					const selfClosing = /\/\s*>$/.test(m[0]) || HTML_VOID_TAGS[tagName] === 1;
					if (isClosing) {
						nodes.push(m[0]);
					} else if (selfClosing) {
						nodes.push(h(React.Fragment, { key: kk }, renderHtmlChunk(m[0], kk, resolveImage)));
					} else {
						const closeRe = new RegExp("</" + tagName + "\\s*>", "i");
						const after = rest.slice(m.index + m[0].length);
						const cm = closeRe.exec(after);
						if (cm !== null) {
							const chunk = m[0] + after.slice(0, cm.index) + cm[0];
							nodes.push(h(React.Fragment, { key: kk }, renderHtmlChunk(chunk, kk, resolveImage)));
							extraSkip = cm.index + cm[0].length;
						} else {
							nodes.push(h(React.Fragment, { key: kk }, renderHtmlChunk(m[0], kk, resolveImage)));
						}
					}
				} else {
					nodes.push(m[1]);
					nodes.push(h("em", { key: kk }, mdInline(m[2], kk, resolveImage)));
				}
				rest = rest.slice(m.index + m[0].length + extraSkip);
			}
			return nodes;
		}

		function mdBuildList(items, keyBase, resolveImage) {
			function build(from, indent) {
				const ordered = items[from].ordered;
				const lis = [];
				let idx = from;
				while (idx < items.length) {
					const it = items[idx];
					if (it.indent < indent) break;
					if (it.indent > indent) {
						const sub = build(idx, it.indent);
						if (lis.length === 0) lis.push(h("li", { key: keyBase + "-x" + idx }, sub.el));
						else {
							const last = lis[lis.length - 1];
							const prev = Array.isArray(last.props.children) ? last.props.children : [last.props.children];
							lis[lis.length - 1] = h("li", { key: last.key }, prev.concat(sub.el));
						}
						idx = sub.idx;
						continue;
					}
					lis.push(h("li", { key: keyBase + "-" + idx }, mdInline(it.text, keyBase + "-" + idx, resolveImage)));
					idx++;
				}
				return { el: h(ordered ? "ol" : "ul", { key: keyBase + "-l" + from }, lis), idx };
			}
			return build(0, items[0].indent).el;
		}

		function renderMarkdown(text, resolveImage) {
			const lines = String(text).split(/\r?\n/);
			const blocks = [];
			let i = 0;
			let key = 0;
			while (i < lines.length) {
				const line = lines[i];
				if (line.trim() === "") { i++; continue; }
				const fence = MD_FENCE_RE.exec(line);
				if (fence !== null) {
					const closer = new RegExp("^" + fence[1].slice(0, 3) + "+\\s*$");
					const buf = [];
					i++;
					while (i < lines.length && !closer.test(lines[i])) { buf.push(lines[i]); i++; }
					i++;
					blocks.push(h("pre", { key: "b" + (key++) }, h("code", null, buf.join("\n"))));
					continue;
				}
				const hd = MD_HEADING_RE.exec(line);
				if (hd !== null) {
					blocks.push(h("h" + hd[1].length, { key: "b" + (key++) }, mdInline(hd[2], "hd" + key, resolveImage)));
					i++;
					continue;
				}
				if (MD_HR_RE.test(line)) { blocks.push(h("hr", { key: "b" + (key++) })); i++; continue; }
				if (MD_QUOTE_RE.test(line)) {
					const buf = [];
					while (i < lines.length && lines[i].trim() !== "") {
						const qm = MD_QUOTE_RE.exec(lines[i]);
						if (qm === null) break;
						buf.push(qm[1]);
						i++;
					}
					blocks.push(h("blockquote", { key: "b" + (key++) }, renderMarkdown(buf.join("\n"), resolveImage)));
					continue;
				}
				if (line.indexOf("|") !== -1 && i + 1 < lines.length && lines[i + 1].indexOf("|") !== -1 && lines[i + 1].indexOf("-") !== -1 && MD_TABLE_SEP_RE.test(lines[i + 1])) {
					const header = mdSplitTableRow(line);
					i += 2;
					const rows = [];
					while (i < lines.length && lines[i].indexOf("|") !== -1 && lines[i].trim() !== "") { rows.push(mdSplitTableRow(lines[i])); i++; }
					blocks.push(h("table", { key: "b" + (key++), className: "pm-md-table" },
						h("thead", null, h("tr", null, header.map((c, ci) => h("th", { key: ci }, mdInline(c, "th" + key + "-" + ci, resolveImage))))),
						h("tbody", null, rows.map((r, ri) => h("tr", { key: ri }, r.map((c, ci) => h("td", { key: ci }, mdInline(c, "td" + key + "-" + ri + "-" + ci, resolveImage)))))),
					));
					continue;
				}
				if (MD_LIST_RE.test(line)) {
					const items = [];
					while (i < lines.length) {
						const m2 = MD_LIST_RE.exec(lines[i]);
						if (m2 === null) {
							if (/^\s{2,}\S/.test(lines[i]) && items.length > 0) {
								items[items.length - 1].text += " " + lines[i].trim();
								i++;
								continue;
							}
							break;
						}
						items.push({ indent: m2[1].replace(/\t/g, "  ").length, ordered: /^\d/.test(m2[2]), text: m2[3] });
						i++;
					}
					blocks.push(mdBuildList(items, "ls" + (key++), resolveImage));
					continue;
				}
				if (line.trim().startsWith("<!--")) {
					while (i < lines.length && lines[i].indexOf("-->") === -1) i++;
					i++;
					continue;
				}
				if (HTML_BLOCK_START_RE.test(line)) {
					const rootTagMatch = /^\s*<([a-zA-Z][a-zA-Z0-9-]*)/.exec(line);
					const rootTag = rootTagMatch !== null ? rootTagMatch[1].toLowerCase() : "";
					const chunk = [line];
					i++;
					if (HTML_VOID_TAGS[rootTag] !== 1 && /\/\s*>$/.test(line.trim()) === false && rootTag !== "") {
						const openRe = new RegExp("<" + rootTag + "(?=[\\s/>])", "gi");
						const closeRe = new RegExp("</" + rootTag + "\\s*>", "gi");
						let depth = 0;
						for (let ci = 0; ci < chunk.length; ci++) {
							depth += (chunk[ci].match(openRe) || []).length;
							depth -= (chunk[ci].match(closeRe) || []).length;
						}
						while (i < lines.length && depth > 0 && chunk.length < 400) {
							chunk.push(lines[i]);
							depth += (lines[i].match(openRe) || []).length;
							depth -= (lines[i].match(closeRe) || []).length;
							i++;
						}
					}
					blocks.push(h("div", { key: "b" + (key++), className: "pm-html" }, renderHtmlChunk(chunk.join("\n"), "html" + key, resolveImage)));
					continue;
				}
				const buf = [line];
				i++;
				while (i < lines.length && lines[i].trim() !== "" && !MD_HEADING_RE.test(lines[i]) && !MD_FENCE_RE.test(lines[i]) && !MD_HR_RE.test(lines[i]) && !MD_QUOTE_RE.test(lines[i]) && !MD_LIST_RE.test(lines[i]) && !HTML_BLOCK_START_RE.test(lines[i])) {
					buf.push(lines[i]);
					i++;
				}
				blocks.push(h("p", { key: "b" + (key++) }, mdInline(buf.join("\n"), "p" + key, resolveImage)));
			}
			return blocks;
		}

		function jobLabel(job) {
			if (job.op === "install") return "正在安装 " + job.spec + " 到 profile " + job.profile;
			if (job.op === "remove") return "正在从 profile " + job.profile + " 移除 " + job.spec;
			return job.spec !== "" ? "正在更新 " + job.spec + "（profile " + job.profile + "）" : "正在更新 profile " + job.profile + " 的全部插件";
		}

		function JobPanel(props) {
			const [job, setJob] = React.useState(null);
			const settledRef = React.useRef(false);
			React.useEffect(() => {
				let alive = true;
				let timer = null;
				function poll() {
					rpc("job", { id: props.jobId })
						.then((r) => {
							if (!alive) return;
							if (r && r.ok) {
								setJob(r.job);
								if (r.job.status === "running") timer = setTimeout(poll, 2000);
								else if (!settledRef.current) {
									settledRef.current = true;
									if (props.onSettled) props.onSettled(r.job.status === "success");
								}
							}
						})
						.catch(() => {});
				}
				poll();
				return () => { alive = false; if (timer !== null) clearTimeout(timer); };
			}, [props.jobId]);
			if (job === null) return h("div", { className: "pm-muted" }, "正在启动任务…");
			const running = job.status === "running";
			return h("div", { className: "pm-job" },
				h("div", { className: "pm-row" },
					running
						? h("span", { className: "pm-badge" }, "执行中…")
						: (job.status === "success" ? h("span", { className: "pm-badge good" }, "成功") : h("span", { className: "pm-badge bad" }, "失败")),
					h("span", { className: "pm-muted" }, running ? jobLabel(job) : (job.status === "success" ? "完成" : "操作失败（退出码 " + job.exitCode + "）")),
					h("span", { className: "pm-spacer" }),
					running ? h("button", { className: "pm-btn danger", onClick: () => rpc("job", { id: props.jobId, cancel: "1" }).catch(() => {}) }, "取消") : null,
				),
				job.note !== "" ? h("div", { className: "pm-muted" }, job.note) : null,
				h("pre", { className: "pm-output", ref: (el) => { if (el !== null) el.scrollTop = el.scrollHeight; } },
					job.output !== "" ? job.output : "（暂无输出）"),
				job.status === "success" ? h("div", { className: "pm-row" },
					h("span", { className: "pm-ok" }, "已完成 — 需重启 DSH 后生效"),
					h("span", { className: "pm-spacer" }),
					h(RestartButton, null)) : null,
				job.status === "error" ? h("div", { className: "pm-error" }, "执行失败 — 请查看上方输出。常见原因：网络/代理、pnpm 与 Node 版本不兼容、包不存在。") : null,
			);
		}

		function Modal(props) {
			React.useEffect(() => {
				function onKey(e) { if (e.key === "Escape") props.onClose(); }
				document.addEventListener("keydown", onKey);
				return () => document.removeEventListener("keydown", onKey);
			}, []);
			return h("div", {
				className: "pm-modal-backdrop",
				onClick: (e) => { if (e.target === e.currentTarget) props.onClose(); },
			}, h("div", { className: "pm-modal" },
				h("div", { className: "pm-modal-body" }, props.children)));
		}

		function RestartOverlay() {
			const [elapsed, setElapsed] = React.useState(0);
			const [failed, setFailed] = React.useState(false);
			React.useEffect(() => {
				let down = false;
				let tries = 0;
				const t0 = Date.now();
				const timer = setInterval(() => {
					setElapsed(Math.round((Date.now() - t0) / 1000));
					tries++;
					fetch(window.location.href, { method: "HEAD", cache: "no-store" })
						.then(() => { if (down) window.location.reload(); })
						.catch(() => { down = true; });
					if (tries > 60) { setFailed(true); clearInterval(timer); }
				}, 2000);
				return () => clearInterval(timer);
			}, []);
			return h("div", { className: "pm-restart-overlay" },
				failed
					? h(React.Fragment, null,
						h("div", { style: { fontSize: "16px", fontWeight: 600 } }, "重启超时"),
						h("div", null, "120 秒内未检测到服务恢复——请手动启动 DSH，然后刷新本页面。"),
						h("button", { className: "pm-btn primary", onClick: () => window.location.reload() }, "刷新页面"))
					: h(React.Fragment, null,
						h("div", { className: "pm-spin" }),
						h("div", { style: { fontWeight: 600 } }, "DSH 正在重启…"),
						h("div", null, "服务恢复后页面将自动刷新（已等待 " + elapsed + " 秒）")));
		}

		function RestartButton() {
			const [confirming, setConfirming] = React.useState(false);
			const [restarting, setRestarting] = React.useState(false);
			const [error, setError] = React.useState("");
			function doRestart() {
				setConfirming(false);
				setError("");
				rpc("restart", { confirm: "1" })
					.then((r) => {
						if (r && r.ok) setRestarting(true);
						else setError(r && r.error ? r.error : "重启请求失败");
					})
					.catch((e) => setError(errMsg(e)));
			}
			if (restarting) return h(RestartOverlay, null);
			return h(React.Fragment, null,
				h("button", { className: "pm-btn primary", onClick: () => setConfirming(true) }, "重启 DSH 并刷新页面"),
				error !== "" ? h("span", { className: "pm-error" }, error) : null,
				confirming ? h(Modal, { onClose: () => setConfirming(false) },
					h("div", { className: "pm-detail" },
						h("div", { className: "pm-row" },
							h("strong", { style: { fontSize: "15px" } }, "重启 DSH 服务？"),
							h("span", { className: "pm-spacer" }),
							h("button", { className: "pm-btn", onClick: () => setConfirming(false) }, "关闭")),
						h("div", { className: "pm-muted" },
							"重启期间服务短暂不可用；服务恢复后页面将自动等待并刷新。若自动拉起失败，需要手动启动 DSH 后刷新页面。"),
						h("div", { className: "pm-row" },
							h("button", { className: "pm-btn primary", onClick: doRestart }, "确认重启"),
							h("button", { className: "pm-btn", onClick: () => setConfirming(false) }, "取消")))) : null);
		}

		function InstallBox(props) {
			const names = props.env && Array.isArray(props.env.profiles) && props.env.profiles.length > 0
				? props.env.profiles.map((p) => p.name)
				: ["web"];
			const [profile, setProfile] = React.useState(names.indexOf(props.defaultProfile) >= 0 ? props.defaultProfile : names[0]);
			const [spec, setSpec] = React.useState(props.defaultSpec);
			const [busy, setBusy] = React.useState(false);
			const [jobId, setJobId] = React.useState(null);
			const [message, setMessage] = React.useState(null);
			React.useEffect(() => { setSpec(props.defaultSpec); setMessage(null); setJobId(null); }, [props.defaultSpec]);
			function request() {
				setBusy(true);
				setMessage(null);
				rpc("request", { op: "install", profile, spec })
					.then((r) => {
						if (r && r.ok) setJobId(r.jobId);
						else { setMessage({ ok: false, text: r && r.error ? r.error : "请求失败" }); setBusy(false); }
					})
					.catch((e) => { setMessage({ ok: false, text: errMsg(e) }); setBusy(false); });
			}
			return h("div", { className: "pm-note" },
				h("div", { className: "pm-row" }, h("strong", null, "安装此插件")),
				jobId !== null
					? h(JobPanel, { jobId, onSettled: (ok) => { setBusy(false); if (ok && props.onRequested) props.onRequested(); } })
					: h(React.Fragment, null,
						h("div", { className: "pm-row" },
							h("label", null, "Profile"),
							h("select", { className: "pm-select", value: profile, onChange: (e) => setProfile(e.target.value) },
								names.map((name) => h("option", { key: name, value: name }, name))),
							h("label", null, "安装源"),
							h("input", { className: "pm-input", style: { flex: "1 1 260px" }, value: spec, onChange: (e) => setSpec(e.target.value) }),
							h("button", { className: "pm-btn primary", disabled: busy, onClick: request }, "申请安装"),
						),
						h("div", { className: "pm-muted" },
							"点击后由插件管理器直接执行 dsh plugin 安装并实时显示输出（git 源若已发布到 npm 会自动改用 npm 包）。安装成功后需重启 DSH 才能组合生效。"),
						message !== null ? h("div", { className: message.ok ? "pm-ok" : "pm-error" }, message.text) : null),
			);
		}

		function useRepoData(fullName) {
			const [data, setData] = React.useState(null);
			const [error, setError] = React.useState("");
			React.useEffect(() => {
				if (fullName === "") return undefined;
				let alive = true;
				setData(null);
				setError("");
				rpc("repo", { fullName })
					.then((r) => {
						if (!alive) return;
						if (r && r.ok) setData(r);
						else setError(r && r.error ? r.error : "加载仓库失败");
					})
					.catch((e) => { if (alive) setError(errMsg(e)); });
				return () => { alive = false; };
			}, [fullName]);
			return { data, error };
		}

		function RepoDetailBody(props) {
			const state = useRepoData(props.fullName);
			if (state.error !== "") return h("div", { className: "pm-error" }, "加载 GitHub 仓库信息失败：" + state.error);
			if (state.data === null) return h("div", { className: "pm-muted" }, "正在加载仓库详情…");
			const data = state.data;
			return h(React.Fragment, null,
				h("div", { className: "pm-facts" },
					h("span", { className: "pm-badge" }, "★ " + data.repo.stars),
					h("span", { className: "pm-badge" }, "派生 " + data.repo.forks),
					h("span", { className: "pm-badge" }, "议题 " + data.repo.openIssues),
					data.repo.license !== "" ? h("span", { className: "pm-badge" }, data.repo.license) : null,
					data.repo.archived ? h("span", { className: "pm-badge bad" }, "已归档") : null,
					data.manifest !== null
						? h("span", { className: "pm-badge" }, (data.manifest.name !== "" ? data.manifest.name : "package") + "@" + data.manifest.version) : null,
					data.manifest !== null && data.manifest.hasBundle
						? h("span", { className: "pm-badge good" }, "dsh.bundle ✓")
						: h("span", { className: "pm-badge bad" }, "无 dsh.bundle（普通依赖）"),
					data.manifest !== null && data.manifest.hasPrepare
						? h("span", { className: "pm-badge bad" }, "含 prepare 脚本 — git 安装将从源码构建") : null,
					data.repo.topics.map((topic) => h("span", { key: topic, className: "pm-badge" }, topic)),
				),
				data.repo.homepage !== "" ? h("div", { className: "pm-muted" }, "主页：", data.repo.homepage) : null,
				props.children !== undefined && props.children !== null ? props.children : null,
				data.readme.name !== ""
					? h(React.Fragment, null,
						h("div", { className: "pm-muted" }, data.readme.name + (data.readme.truncated ? "（已截断）" : "")),
						h("div", { className: "pm-readme pm-md" }, renderMarkdown(data.readme.text, (src) => {
							if (/^https?:\/\//i.test(src)) return src;
							if (/^(data|javascript|vbscript):/i.test(src)) return null;
							return "https://raw.githubusercontent.com/" + data.repo.fullName + "/" + data.repo.branch + "/" + src.replace(/^\.\//, "");
						})))
					: h("div", { className: "pm-muted" }, "未找到 README。"),
			);
		}

		function DetailPanel(props) {
			return h("div", { className: "pm-detail" },
				h("div", { className: "pm-row" },
					h("strong", { style: { fontSize: "15px" } }, props.fullName),
					h("span", { className: "pm-spacer" }),
					h("a", { className: "pm-btn", href: "https://github.com/" + props.fullName, target: "_blank", rel: "noreferrer" }, "GitHub ↗"),
					h("button", { className: "pm-btn", onClick: props.onClose }, "关闭"),
				),
				h(RepoDetailBody, { fullName: props.fullName },
					h(InstallBox, { env: props.env, defaultProfile: props.defaultProfile, defaultSpec: "github:" + props.fullName, onRequested: props.onRequested })),
			);
		}

		function RepoCard(props) {
			const repo = props.repo;
			return h("div", { className: "pm-card" },
				h("div", { className: "pm-card-head" },
					repo.owner.avatar !== ""
						? h("img", { className: "pm-avatar", src: repo.owner.avatar, alt: "" })
						: h("div", { className: "pm-avatar" }),
					h("span", { className: "pm-name", title: "查看详情", onClick: () => props.onOpen(repo.fullName) }, repo.fullName),
				),
				h("div", { className: "pm-desc" }, repo.description !== "" ? repo.description : "（无描述）"),
				h("div", { className: "pm-meta" },
					h("span", null, "★ " + repo.stars),
					repo.language !== "" ? h("span", null, repo.language) : null,
					h("span", null, "更新于 " + repo.updatedAt.slice(0, 10)),
					repo.archived ? h("span", { className: "pm-warn" }, "已归档") : null,
				),
				h("div", { className: "pm-actions" },
					h("button", { className: "pm-btn", onClick: () => props.onOpen(repo.fullName) }, "详情 / 安装"),
					h("a", { className: "pm-btn", href: repo.url, target: "_blank", rel: "noreferrer" }, "GitHub ↗"),
				),
			);
		}

		function ProxyBar() {
			const [info, setInfo] = React.useState(null);
			const [value, setValue] = React.useState("");
			const [busy, setBusy] = React.useState(false);
			const [msg, setMsg] = React.useState(null);
			function refresh() { rpc("proxy").then((r) => { if (r && r.ok) setInfo(r); }).catch(() => {}); }
			React.useEffect(() => { refresh(); }, []);
			function applyProxy() {
				if (value.trim() === "") { setMsg({ ok: false, text: "请先输入代理地址（如 http://127.0.0.1:7890），或留空后点「清除」" }); return; }
				setBusy(true);
				rpc("proxy", { set: value.trim() })
					.then((r) => {
						if (r && r.ok) { setInfo(r); setMsg({ ok: true, text: "已保存并生效：" + (r.proxy === "" ? "强制直连" : r.proxy) + "（" + r.source + "）" }); setValue(""); }
						else setMsg({ ok: false, text: r && r.error ? r.error : "应用失败" });
					})
					.catch((e) => setMsg({ ok: false, text: errMsg(e) }))
					.then(() => setBusy(false));
			}
			function clearProxy() {
				rpc("proxy", { clear: "1" })
					.then((r) => {
						if (r && r.ok) { setInfo(r); setMsg({ ok: true, text: "已清除保存的代理设置，当前生效：" + (r.proxy === "" ? "直连" : r.proxy + "（" + r.source + "）") }); }
					})
					.catch((e) => setMsg({ ok: false, text: errMsg(e) }));
			}
			function testProxy() {
				setBusy(true);
				setMsg(null);
				rpc("proxy-test")
					.then((r) => {
						if (r && r.ok) setMsg({ ok: true, text: "连接成功 — HTTP " + r.status + "，" + r.latencyMs + "ms，经由 " + (r.proxy !== "" ? r.proxy : "直连") + (r.text ? "，响应：" + r.text : "") });
						else setMsg({ ok: false, text: r && r.error ? r.error : "测试失败" });
					})
					.catch((e) => setMsg({ ok: false, text: errMsg(e) }))
					.then(() => setBusy(false));
			}
			return h("div", { className: "pm-note" },
				h("div", { className: "pm-row" },
					h("strong", null, "GitHub 代理"),
					h("span", { className: "pm-muted" }, info === null ? "检测中…" : (info.proxy !== "" ? info.proxy + " — " + info.source : "直连 — " + info.source)),
					info !== null && info.curl === false ? h("span", { className: "pm-error" }, "宿主未找到 curl，代理不可用") : null,
				),
				h("div", { className: "pm-row" },
					h("input", {
						className: "pm-input",
						style: { flex: "1 1 260px" },
						placeholder: "http://127.0.0.1:7890（支持 http / https / socks5 / socks5h / socks4）",
						value: value,
						onChange: (e) => setValue(e.target.value),
						onKeyDown: (e) => { if (e.key === "Enter") applyProxy(); },
					}),
					h("button", { className: "pm-btn primary", disabled: busy, onClick: applyProxy }, "应用"),
					h("button", { className: "pm-btn", disabled: busy, onClick: clearProxy }, "清除"),
					h("button", { className: "pm-btn", disabled: busy, onClick: testProxy }, "测试连接"),
				),
				h("div", { className: "pm-muted" }, "设置会保存到 DSH 主目录（plug-manager.json），重启后仍然生效。优先级：持久设置 > 插件配置（patch config.proxy）> 环境变量（HTTPS_PROXY 等）。"),
				msg !== null ? h("div", { className: msg.ok ? "pm-ok" : "pm-error" }, msg.text) : null,
			);
		}

		function DiscoverView(props) {
			const [query, setQuery] = React.useState("");
			const [sort, setSort] = React.useState("");
			const [repos, setRepos] = React.useState([]);
			const [total, setTotal] = React.useState(null);
			const [page, setPage] = React.useState(0);
			const [loading, setLoading] = React.useState(false);
			const [error, setError] = React.useState("");
			const [selected, setSelected] = React.useState(null);

			function runSearch(reset, queryText, sortMode, currentPage, currentRepos) {
				setLoading(true);
				setError("");
				const target = reset ? 1 : currentPage + 1;
				rpc("search", { query: queryText, sort: sortMode, page: target })
					.then((r) => {
						if (r && r.ok) {
							setTotal(r.total);
							setRepos(reset ? r.repos : currentRepos.concat(r.repos));
							setPage(r.page);
						} else setError(r && r.error ? r.error : "搜索失败");
					})
					.catch((e) => setError(errMsg(e)))
					.then(() => setLoading(false));
			}

			React.useEffect(() => { runSearch(true, "", "", 0, []); }, []);

			return h(React.Fragment, null,
				h(ProxyBar, null),
				h("div", { className: "pm-toolbar" },
					h("input", {
						className: "pm-input",
						placeholder: "搜索带 dsh-plugin 标签的仓库…",
						value: query,
						onChange: (e) => setQuery(e.target.value),
						onKeyDown: (e) => { if (e.key === "Enter") runSearch(true, query, sort, 0, []); },
					}),
					h("select", { className: "pm-select", value: sort, onChange: (e) => setSort(e.target.value) },
						h("option", { value: "" }, "最佳匹配"),
						h("option", { value: "stars" }, "最多 Star"),
						h("option", { value: "updated" }, "最近更新"),
					),
					h("button", { className: "pm-btn", disabled: loading, onClick: () => runSearch(true, query, sort, 0, []) }, "搜索"),
				),
				h("div", { className: "pm-muted" },
					total !== null ? total + " 个带 dsh-plugin 标签的仓库（github.com/topics/dsh-plugin）" : "正在浏览 github.com/topics/dsh-plugin…",
					loading ? " — 加载中…" : ""),
				error !== "" ? h("div", { className: "pm-error" }, error) : null,
				selected !== null
					? h(Modal, { onClose: () => setSelected(null) },
						h(DetailPanel, { fullName: selected, env: props.env, defaultProfile: props.defaultProfile, onClose: () => setSelected(null), onRequested: props.onRequested }))
					: null,
				h("div", { className: "pm-cards" }, repos.map((repo) => h(RepoCard, { key: repo.fullName, repo, onOpen: setSelected }))),
				total !== null && repos.length < total
					? h("div", { className: "pm-row" }, h("button", { className: "pm-btn", disabled: loading, onClick: () => runSearch(false, query, sort, page, repos) }, "加载更多"))
					: null,
			);
		}

		/** 旧版宿主（v0.5.0 之前）的 /plug-mgr/profiles 不返回依赖元数据字段；
		 * 统一补齐默认值，保证新旧宿主下「已安装」页都能渲染。 */
		function normalizeDep(dep) {
			const d = dep !== null && typeof dep === "object" ? dep : {};
			return {
				name: typeof d.name === "string" ? d.name : "",
				spec: typeof d.spec === "string" ? d.spec : "",
				isBundle: d.isBundle === true,
				version: typeof d.version === "string" ? d.version : "",
				description: typeof d.description === "string" ? d.description : "",
				license: typeof d.license === "string" ? d.license : "",
				homepage: typeof d.homepage === "string" ? d.homepage : "",
				repoUrl: typeof d.repoUrl === "string" ? d.repoUrl : "",
				githubFullName: typeof d.githubFullName === "string" ? d.githubFullName : "",
				hasPrepare: d.hasPrepare === true,
			};
		}

		function InstalledCard(props) {
			const dep = props.dep;
			const initial = dep.name.replace(/^@/, "").charAt(0).toUpperCase();
			const local = dep.spec.indexOf("link:") === 0 || dep.spec.indexOf("file:") === 0 || dep.spec.indexOf("/") === 0 || dep.spec.indexOf("~/") === 0;
			return h("div", { className: "pm-card" },
				h("div", { className: "pm-card-head" },
					h("div", { className: "pm-avatar letter" }, initial !== "" ? initial : "?"),
					h("span", { className: "pm-name", title: "查看详情", onClick: () => props.onOpen(dep.name) }, dep.name),
				),
				h("div", { className: "pm-desc" }, dep.description !== "" ? dep.description : "（无描述）"),
				h("div", { className: "pm-meta" },
					dep.version !== "" ? h("span", null, "v" + dep.version) : null,
					h("span", { title: dep.spec }, dep.spec),
					dep.license !== "" ? h("span", null, dep.license) : null,
				),
				h("div", { className: "pm-facts" },
					dep.isBundle ? h("span", { className: "pm-badge good" }, "dsh.bundle") : h("span", { className: "pm-badge" }, "普通依赖"),
					local ? h("span", { className: "pm-badge" }, "本地源") : null,
					dep.hasPrepare ? h("span", { className: "pm-badge bad" }, "含 prepare 脚本") : null,
				),
				props.jobId !== null ? h(JobPanel, { jobId: props.jobId, onSettled: props.onSettled }) : null,
				h("div", { className: "pm-actions" },
					h("button", { className: "pm-btn", onClick: () => props.onOpen(dep.name) }, "详情"),
					dep.repoUrl !== "" ? h("a", { className: "pm-btn", href: dep.repoUrl, target: "_blank", rel: "noreferrer" }, dep.repoUrl.indexOf("github.com") >= 0 ? "GitHub ↗" : "仓库 ↗") : null,
					h("button", { className: "pm-btn", onClick: () => props.onUpdate(dep.name) }, "更新"),
					h("button", { className: "pm-btn danger", onClick: () => props.onRemove(dep.name) }, "移除"),
				),
			);
		}

		function InstalledDetailPanel(props) {
			const dep = props.dep;
			const [jobId, setJobId] = React.useState(null);
			const [message, setMessage] = React.useState(null);
			const ghUrl = dep.repoUrl !== "" ? dep.repoUrl : (dep.githubFullName !== "" ? "https://github.com/" + dep.githubFullName : "");
			function requestOp(op) {
				setMessage(null);
				rpc("request", { op, profile: props.profileName, packageName: dep.name })
					.then((r) => {
						if (r && r.ok) setJobId(r.jobId);
						else setMessage({ ok: false, text: r && r.error ? r.error : "请求失败" });
					})
					.catch((e) => setMessage({ ok: false, text: errMsg(e) }));
			}
			return h("div", { className: "pm-detail" },
				h("div", { className: "pm-row" },
					h("strong", { style: { fontSize: "15px" } }, dep.name + (dep.version !== "" ? "@" + dep.version : "")),
					h("span", { className: "pm-spacer" }),
					ghUrl !== "" ? h("a", { className: "pm-btn", href: ghUrl, target: "_blank", rel: "noreferrer" }, ghUrl.indexOf("github.com") >= 0 ? "GitHub ↗" : "仓库 ↗") : null,
					h("button", { className: "pm-btn", onClick: props.onClose }, "关闭"),
				),
				h("div", { className: "pm-facts" },
					h("span", { className: "pm-badge" }, "Profile：" + props.profileName),
					dep.isBundle ? h("span", { className: "pm-badge good" }, "dsh.bundle") : h("span", { className: "pm-badge" }, "普通依赖"),
					dep.license !== "" ? h("span", { className: "pm-badge" }, dep.license) : null,
					dep.hasPrepare ? h("span", { className: "pm-badge bad" }, "含 prepare 脚本") : null,
				),
				dep.description !== "" ? h("div", { className: "pm-muted" }, dep.description) : null,
				h("div", { className: "pm-row" },
					h("span", { className: "pm-muted" }, "安装源："),
					h("span", { className: "pm-code" }, dep.spec)),
				dep.homepage !== "" ? h("div", { className: "pm-muted" }, "主页：", dep.homepage) : null,
				h("div", { className: "pm-note" },
					h("div", { className: "pm-row" }, h("strong", null, "管理此插件")),
					jobId !== null
						? h(JobPanel, { jobId, onSettled: (ok) => { if (ok && props.onRequested) props.onRequested(); } })
						: h("div", { className: "pm-row" },
							h("button", { className: "pm-btn primary", onClick: () => requestOp("update") }, "更新"),
							h("button", { className: "pm-btn danger", onClick: () => requestOp("remove") }, "移除"),
							h("span", { className: "pm-muted" }, "由插件管理器直接执行 dsh plugin 并实时显示输出，完成后需重启 DSH 生效。")),
					message !== null ? h("div", { className: message.ok ? "pm-ok" : "pm-error" }, message.text) : null,
				),
				dep.githubFullName !== ""
					? h(RepoDetailBody, { fullName: dep.githubFullName })
					: h("div", { className: "pm-muted" }, "此插件未关联 GitHub 仓库，无法展示仓库详情与 README。"),
			);
		}

		function ProfileCard(props) {
			const p = props.profile;
			const [job, setJob] = React.useState(null);
			const [message, setMessage] = React.useState(null);
			const [selected, setSelected] = React.useState(null);
			function requestOp(op, packageName) {
				setMessage(null);
				rpc("request", { op, profile: p.name, packageName })
					.then((r) => {
						if (r && r.ok) setJob({ id: r.jobId, dep: packageName });
						else setMessage({ ok: false, text: r && r.error ? r.error : "请求失败" });
					})
					.catch((e) => setMessage({ ok: false, text: errMsg(e) }));
			}
			const deps = Array.isArray(p.dependencies) ? p.dependencies.map(normalizeDep) : [];
			const filter = typeof props.filter === "string" ? props.filter : "";
			const visibleDeps = filter === ""
				? deps
				: deps.filter((d) => (d.name + " " + d.spec + " " + d.description).toLowerCase().indexOf(filter) !== -1);
			const selectedDep = selected === null ? null : deps.find((d) => d.name === selected) ?? null;
			return h("div", { className: "pm-profile-card" },
				h("div", { className: "pm-row" },
					h("strong", null, "Profile：" + p.name),
					h("span", { className: "pm-spacer" }),
					deps.length > 0 ? h("button", { className: "pm-btn", onClick: () => requestOp("update", "") }, "全部更新") : null,
				),
				h("div", { className: "pm-muted" }, "Bundle 栈：" + (p.bundles.length > 0 ? p.bundles.join(" → ") : "（空）")),
				job !== null && job.dep === "" ? h(JobPanel, { jobId: job.id, onSettled: (ok) => { if (ok && props.onRequested) props.onRequested(); } }) : null,
				deps.length === 0 ? h("div", { className: "pm-muted" }, "此 profile 尚未安装外部插件。") : null,
				deps.length > 0 && visibleDeps.length === 0 ? h("div", { className: "pm-muted" }, "没有匹配「" + filter + "」的插件。") : null,
				h("div", { className: "pm-cards" },
					visibleDeps.map((dep) => h(InstalledCard, {
						key: dep.name,
						dep,
						onOpen: setSelected,
						onUpdate: (name) => requestOp("update", name),
						onRemove: (name) => requestOp("remove", name),
						jobId: job !== null && job.dep === dep.name ? job.id : null,
						onSettled: (ok) => { if (ok && props.onRequested) props.onRequested(); },
					}))),
				message !== null ? h("div", { className: message.ok ? "pm-ok" : "pm-error" }, message.text) : null,
				selectedDep !== null && selectedDep !== undefined
					? h(Modal, { onClose: () => setSelected(null) },
						h(InstalledDetailPanel, { dep: selectedDep, profileName: p.name, onClose: () => setSelected(null), onRequested: props.onRequested }))
					: null,
			);
		}

		function InstalledView(props) {
			const env = props.env;
			const [query, setQuery] = React.useState("");
			if (env === null) return h("div", { className: "pm-muted" }, "正在加载 profile…");
			const filter = query.trim().toLowerCase();
			return h(React.Fragment, null,
				h("div", { className: "pm-note" },
					h("div", null, "DSH 主目录：", h("span", { className: "pm-code" }, env.dshHome)),
					h("div", null, "dsh CLI：", env.cli.kind !== "missing"
						? h("span", { className: "pm-code" }, env.cli.kind === "bin" ? env.cli.value : env.cli.value + "（源码目录）")
						: h("span", { className: "pm-error" }, "未找到 — 安装将会失败")),
					h("div", null, "pnpm：", env.pnpm !== "" ? h("span", { className: "pm-code" }, env.pnpm) : h("span", { className: "pm-error" }, "未找到")),
					h("div", { className: "pm-muted" }, "等效命令：dsh plugin --profile <name> add -w <package>（profile 本身是 pnpm workspace 根目录，必须带 -w）。此处的操作由插件管理器直接执行并实时显示输出。"),
				),
				h("div", { className: "pm-toolbar" },
					h("input", {
						className: "pm-input",
						placeholder: "搜索已安装插件（名称 / 安装源 / 描述）…",
						value: query,
						onChange: (e) => setQuery(e.target.value),
					}),
					query !== "" ? h("button", { className: "pm-btn", onClick: () => setQuery("") }, "清除") : null,
				),
				env.profiles.map((p) => h(ProfileCard, { key: p.name, profile: p, onRequested: props.onRequested, filter })),
			);
		}

		function PlugMarketplace() {
			const [tab, setTab] = React.useState("discover");
			const [env, setEnv] = React.useState(null);
			const [error, setError] = React.useState("");

			function refreshEnv() {
				rpc("profiles")
					.then((r) => {
						if (r && r.ok) { setEnv(r); setError(""); }
						else setError(r && r.error ? r.error : "加载 profile 失败");
					})
					.catch((e) => setError(errMsg(e)));
			}
			React.useEffect(() => { refreshEnv(); }, []);

			const defaultProfile = env !== null && env.profiles.length > 0 ? env.profiles[0].name : "web";

			return h("div", { className: "pm-root" },
				h("div", { className: "pm-tabs" },
					h("button", { className: "pm-tab" + (tab === "discover" ? " active" : ""), onClick: () => setTab("discover") }, "发现"),
					h("button", { className: "pm-tab" + (tab === "installed" ? " active" : ""), onClick: () => setTab("installed") }, "已安装"),
					h("span", { className: "pm-spacer" }),
					h("a", { className: "pm-btn", style: { alignSelf: "center", marginBottom: "6px" }, href: "https://casually.github.io/dsh-plug-hub/", target: "_blank", rel: "noreferrer noopener", title: "在新窗口打开插件社区" }, "插件社区 ↗"),
				),
				error !== "" ? h("div", { className: "pm-error" }, error) : null,
				tab === "discover"
					? h(DiscoverView, { env, defaultProfile, onRequested: refreshEnv })
					: h(InstalledView, { env, onRequested: refreshEnv }),
			);
		}

		function apply(ctx) {
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-plug-manager";
				tag.dataset.pluginCss = "dsh-plug-manager/marketplace.css";
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => { tag.remove(); };
			}, "plug-manager: css");
			const slots = ctx.get("slots");
			if (slots === undefined) return;
			slots.inject("settings.plugins.tab", () => slots.register(
				{ name: "settings.plugins.tab", id: "plug-marketplace", order: 30, label: "插件市场" },
				() => h(PlugMarketplace, null),
			));
		}

		exports.apply = apply;
		exports.inject = ["slots"];
		return module.exports;
	}
});
