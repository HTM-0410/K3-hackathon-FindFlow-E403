"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ResourceType = "slide" | "video" | "github" | "lab" | "announcement" | "guide";
type Resource = {
  id: string; title: string; summary: string; type: ResourceType; topic: string;
  tags: string[]; sourceChannel: string; sourceUrl: string; sharedBy: string;
  sharedAt: string; keywords: string[]; relevanceScore?: number; matchReason: string;
};
type Filters = { type: ResourceType | "all"; topic: string; channel: string; sortBy: string };

const resources: Resource[] = [
  { id:"res-001", title:"Slide giới thiệu Venture Arena Hackathon", summary:"Tổng quan thử thách, các mốc checkpoint, tiêu chí đánh giá và hành trình từ ý tưởng đến demo.", type:"slide", topic:"Hackathon", tags:["Venture Arena","CP2","demo"], sourceChannel:"#hackathon", sourceUrl:"https://example.com/resources/res-001", sharedBy:"Mentor Minh", sharedAt:"2026-07-22", keywords:["hackathon","venture","slide","chấm điểm"], matchReason:"Tiêu đề và nội dung trùng trực tiếp với nhu cầu tìm slide Hackathon." },
  { id:"res-002", title:"Luật chơi và cách tính điểm Venture Arena", summary:"Cách tính điểm checkpoint, rubric sản phẩm và các điều kiện để bài dự thi được ghi nhận.", type:"guide", topic:"Hackathon", tags:["luật chơi","chấm điểm","rubric"], sourceChannel:"#hackathon", sourceUrl:"https://example.com/resources/res-002", sharedBy:"Ban tổ chức", sharedAt:"2026-07-23", keywords:["hackathon","venture","điểm","chấm điểm"], matchReason:"Giải thích chi tiết luật chơi và cách tính điểm Venture Arena." },
  { id:"res-003", title:"Repository mẫu gọi OpenAI API bằng Python", summary:"Code mẫu tối giản gồm cấu hình client, gửi prompt và xử lý phản hồi trong Python.", type:"github", topic:"LLM/API", tags:["OpenAI API","Python","code mẫu"], sourceChannel:"#lab-support", sourceUrl:"https://example.com/resources/res-003", sharedBy:"Mentor An", sharedAt:"2026-07-18", keywords:["openai","api","code","github","python"], matchReason:"Có code Python và ví dụ gọi OpenAI API đúng chủ đề truy vấn." },
  { id:"res-004", title:"Hướng dẫn viết prompt theo Draft–Critique–Revise", summary:"Quy trình ba bước giúp tạo bản nháp, tự phê bình và cải thiện prompt có hệ thống.", type:"guide", topic:"Prompt Engineering", tags:["prompt","DCR","hướng dẫn"], sourceChannel:"#tai-lieu", sourceUrl:"https://example.com/resources/res-004", sharedBy:"Giảng viên Lan", sharedAt:"2026-07-14", keywords:["prompt","viết prompt","critique","revise"], matchReason:"Nội dung hướng dẫn trực tiếp kỹ thuật viết và cải thiện prompt." },
  { id:"res-005", title:"Slide Workshop Prompt Engineering", summary:"Slide workshop về cấu trúc prompt, few-shot, chain of thought và bài tập thực hành.", type:"slide", topic:"Workshop", tags:["prompt","workshop","slide"], sourceChannel:"#workshop", sourceUrl:"https://example.com/resources/res-005", sharedBy:"Giảng viên Lan", sharedAt:"2026-07-12", keywords:["prompt","workshop","slide"], matchReason:"Slide workshop có phần thực hành Prompt Engineering." },
  { id:"res-006", title:"Video ghi hình buổi học về Foundation Model", summary:"Bản ghi buổi học giải thích mô hình nền tảng, pre-training và cách ứng dụng trong sản phẩm.", type:"video", topic:"LLM/API", tags:["foundation model","video","LLM"], sourceChannel:"#tai-lieu", sourceUrl:"https://example.com/resources/res-006", sharedBy:"Trợ giảng Huy", sharedAt:"2026-07-10", keywords:["foundation model","video","llm"], matchReason:"Video ghi hình tập trung vào Foundation Model." },
  { id:"res-007", title:"Bài lab xây dựng chatbot cơ bản", summary:"Bài lab từng bước xây giao diện chatbot và kết nối luồng gọi API bằng dữ liệu thử nghiệm.", type:"lab", topic:"LLM/API", tags:["chatbot","API","thực hành"], sourceChannel:"#lab-support", sourceUrl:"https://example.com/resources/res-007", sharedBy:"Mentor An", sharedAt:"2026-07-19", keywords:["openai","api","code","chatbot","lab"], matchReason:"Bài thực hành liên quan trực tiếp đến code và API." },
  { id:"res-008", title:"Quy định và hướng dẫn tính điểm XP", summary:"Các hoạt động được cộng XP, công thức quy đổi và thời điểm cập nhật bảng điểm.", type:"announcement", topic:"Quy định khóa học", tags:["XP","điểm","quy định"], sourceChannel:"#general", sourceUrl:"https://example.com/resources/res-008", sharedBy:"Ban vận hành", sharedAt:"2026-07-08", keywords:["xp","điểm","quy định"], matchReason:"Thông báo chính thức giải thích cách tính điểm XP." },
  { id:"res-009", title:"Lịch Mentor Duty và Office Hour", summary:"Lịch trực mentor theo tuần, khung giờ Office Hour và cách đăng ký hỗ trợ.", type:"announcement", topic:"Quy định khóa học", tags:["mentor","office hour","lịch"], sourceChannel:"#general", sourceUrl:"https://example.com/resources/res-009", sharedBy:"Ban vận hành", sharedAt:"2026-07-25", keywords:["mentor","office hour","lịch"], matchReason:"Khớp đầy đủ các từ khóa lịch mentor và Office Hour." },
  { id:"res-010", title:"Ngân hàng đề tài Hackathon", summary:"Danh sách bài toán gợi ý theo lĩnh vực, mức độ khó và dữ liệu mẫu có thể sử dụng.", type:"guide", topic:"Hackathon", tags:["ý tưởng","đề tài","Hackathon"], sourceChannel:"#hackathon", sourceUrl:"https://example.com/resources/res-010", sharedBy:"Ban tổ chức", sharedAt:"2026-07-21", keywords:["hackathon","đề tài","venture"], matchReason:"Thuộc nhóm tài liệu chuẩn bị và triển khai Hackathon." },
  { id:"res-011", title:"Checklist nộp Checkpoint CP1–CP6", summary:"Danh sách artifact cần nộp, deadline và cách tự kiểm tra trước từng checkpoint.", type:"guide", topic:"Hackathon", tags:["checkpoint","checklist","nộp bài"], sourceChannel:"#hackathon", sourceUrl:"https://example.com/resources/res-011", sharedBy:"Ban tổ chức", sharedAt:"2026-07-24", keywords:["hackathon","checkpoint","cp2","demo"], matchReason:"Checklist hỗ trợ hoàn thành các mốc của Hackathon." },
  { id:"res-012", title:"Tổng hợp công cụ AI hỗ trợ học tập", summary:"Danh sách công cụ gợi ý cho ghi chú, nghiên cứu, trình bày và quản lý kiến thức.", type:"guide", topic:"Công cụ", tags:["công cụ AI","học tập","tổng hợp"], sourceChannel:"#tai-lieu", sourceUrl:"https://example.com/resources/res-012", sharedBy:"Cộng đồng lớp", sharedAt:"2026-07-06", keywords:["công cụ","ai","học tập"], matchReason:"Tổng hợp các công cụ hỗ trợ việc học." },
];

const typeLabels: Record<ResourceType,string> = { slide:"Slide", video:"Video", github:"GitHub/Code", lab:"Bài lab", announcement:"Thông báo", guide:"Tài liệu hướng dẫn" };
const typeIcons: Record<ResourceType,string> = { slide:"▤", video:"▶", github:"⌘", lab:"⚗", announcement:"◉", guide:"◇" };
const suggestions = ["Slide hướng dẫn làm Hackathon","Code mẫu gọi OpenAI API","Quy định tính điểm XP","Link workshop Prompt Engineering"];
const defaultFilters: Filters = { type:"all", topic:"all", channel:"all", sortBy:"relevance" };

function normalize(value:string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
}

function searchResources(query:string) {
  const q = normalize(query);
  const tokens = q.split(/\s+/).filter(t => t.length > 1);
  const foodWords = ["nau an","mon an","am thuc","bong da","du lich"];
  if (foodWords.some(word => q.includes(word))) return [];
  const priority: Record<string,string[]> = {
    hackathon:"res-001,res-002,res-010,res-011".split(","), venture:"res-001,res-002,res-010,res-011".split(","),
    openai:["res-003","res-007"], api:["res-003","res-007"], prompt:["res-004","res-005"], xp:["res-008","res-002"],
    mentor:["res-009"], foundation:["res-006"], video:["res-006"],
  };
  return resources.map((item) => {
    const title=normalize(item.title), summary=normalize(item.summary), topic=normalize(item.topic);
    let score=0;
    tokens.forEach(token => {
      if(title.includes(token)) score+=5;
      if(item.tags.some(tag=>normalize(tag).includes(token))) score+=4;
      if(item.keywords.some(keyword=>normalize(keyword).includes(token))) score+=3;
      if(topic.includes(token)) score+=3;
      if(summary.includes(token)) score+=1;
    });
    Object.entries(priority).forEach(([key,ids]) => { if(q.includes(key) && ids.includes(item.id)) score+=18-ids.indexOf(item.id); });
    return {...item, relevanceScore:Math.min(98,70+score)};
  }).filter(item => (item.relevanceScore ?? 70) > 70).sort((a,b)=>(b.relevanceScore??0)-(a.relevanceScore??0)).slice(0,5);
}

function AppHeader({route,navigate}:{route:string;navigate:(path:string)=>void}) {
  return <header className="header"><button className="brand" onClick={()=>navigate("/")} aria-label="Về trang chủ"><span className="brand-mark">⌕</span><span><b>Discord Knowledge Hub</b><small>Kho tri thức khóa học</small></span></button>
    <nav><button className={route==="home"||route==="search"?"active":""} onClick={()=>navigate("/")}>Tìm kiếm</button><button className={route==="resources"?"active":""} onClick={()=>navigate("/resources")}>Kho tài liệu</button></nav>
    <span className="cp-badge">Prototype CP2</span></header>;
}

function SearchBar({initial="",onSearch,compact=false}:{initial?:string;onSearch:(q:string)=>void;compact?:boolean}) {
  const [value,setValue]=useState(initial);
  useEffect(()=>setValue(initial),[initial]);
  const submit=(e:FormEvent)=>{e.preventDefault();if(value.trim())onSearch(value.trim())};
  return <form className={`search-bar ${compact?"compact":""}`} onSubmit={submit}><span className="search-icon">⌕</span><input aria-label="Nhu cầu tìm kiếm" value={value} onChange={e=>setValue(e.target.value)} placeholder="Ví dụ: Tìm slide hướng dẫn Hackathon và cách tính điểm"/><button disabled={!value.trim()}>Tìm tài liệu <span>→</span></button></form>;
}

function FilterPanel({filters,setFilters,showRelevance=true}:{filters:Filters;setFilters:(f:Filters)=>void;showRelevance?:boolean}) {
  const update=(key:keyof Filters,value:string)=>setFilters({...filters,[key]:value});
  return <aside className="filters"><div className="filter-head"><h3>Bộ lọc</h3><button onClick={()=>setFilters(defaultFilters)}>Xóa tất cả</button></div>
    <label>Loại tài liệu<select value={filters.type} onChange={e=>update("type",e.target.value)}><option value="all">Tất cả loại</option>{Object.entries(typeLabels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
    <label>Chủ đề<select value={filters.topic} onChange={e=>update("topic",e.target.value)}><option value="all">Tất cả chủ đề</option>{[...new Set(resources.map(r=>r.topic))].map(v=><option key={v}>{v}</option>)}</select></label>
    <label>Kênh nguồn<select value={filters.channel} onChange={e=>update("channel",e.target.value)}><option value="all">Tất cả kênh</option>{[...new Set(resources.map(r=>r.sourceChannel))].map(v=><option key={v}>{v}</option>)}</select></label>
    <label>Sắp xếp<select value={filters.sortBy} onChange={e=>update("sortBy",e.target.value)}>{showRelevance&&<option value="relevance">Phù hợp nhất</option>}<option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="title">A–Z</option></select></label>
  </aside>;
}

function ResourceCard({resource,onDetail,onSource}:{resource:Resource;onDetail:()=>void;onSource:()=>void}) {
  return <article className="resource-card"><div className="card-top"><span className={`type-icon ${resource.type}`}>{typeIcons[resource.type]}</span><span className="type-label">{typeLabels[resource.type]}</span>{resource.relevanceScore&&<span className="relevance">{resource.relevanceScore}% phù hợp</span>}</div>
    <h3>{resource.title}</h3><p>{resource.summary}</p><div className="tags">{resource.tags.slice(0,3).map(t=><span key={t}>{t}</span>)}</div>
    <div className="meta"><span>{resource.sourceChannel}</span><span>•</span><span>{new Date(resource.sharedAt).toLocaleDateString("vi-VN")}</span></div>
    <div className="card-actions"><button className="primary" onClick={onDetail}>Xem chi tiết</button><button className="secondary" onClick={onSource}>Mở nguồn ↗</button></div></article>;
}

function EmptyState({clear,navigate}:{clear:()=>void;navigate:(p:string)=>void}) {
  return <div className="empty"><div className="empty-icon">⌕</div><h2>Chưa tìm thấy tài liệu phù hợp</h2><p>Hãy thử mô tả ngắn hơn, thay đổi từ khóa hoặc xóa bộ lọc.</p><div><button className="primary" onClick={clear}>Xóa bộ lọc và thử lại</button><button className="secondary" onClick={()=>navigate("/resources")}>Xem toàn bộ kho tài liệu</button></div></div>;
}

function Drawer({resource,query,onClose,onToast}:{resource:Resource;query:string;onClose:()=>void;onToast:(s:string)=>void}) {
  const key=`feedback:${resource.id}:${normalize(query)}`;
  const [sent,setSent]=useState(false);
  useEffect(()=>{setSent(Boolean(localStorage.getItem(key)));const esc=(e:KeyboardEvent)=>e.key==="Escape"&&onClose();document.addEventListener("keydown",esc);return()=>document.removeEventListener("keydown",esc)},[key,onClose]);
  const feedback=(helpful:boolean)=>{localStorage.setItem(key,JSON.stringify({resourceId:resource.id,query,helpful,createdAt:new Date().toISOString()}));setSent(true);onToast("Cảm ơn bạn! Phản hồi đã được ghi nhận.")};
  const copy=async()=>{await navigator.clipboard?.writeText(resource.sourceUrl);onToast("Đã sao chép link tài liệu.")};
  return <div className="drawer-wrap" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><aside className="drawer" role="dialog" aria-modal="true" aria-label={`Chi tiết ${resource.title}`}>
    <div className="drawer-top"><span className="type-label">{typeLabels[resource.type]}</span><button className="close" onClick={onClose} aria-label="Đóng">×</button></div><h2>{resource.title}</h2><p className="drawer-summary">{resource.summary}</p>
    <section><h4>Thông tin tài liệu</h4><dl><div><dt>Chủ đề</dt><dd>{resource.topic}</dd></div><div><dt>Kênh nguồn</dt><dd>{resource.sourceChannel}</dd></div><div><dt>Người chia sẻ</dt><dd>{resource.sharedBy}</dd></div><div><dt>Ngày chia sẻ</dt><dd>{new Date(resource.sharedAt).toLocaleDateString("vi-VN")}</dd></div></dl></section>
    <section className="reason"><h4>Vì sao tài liệu này phù hợp?</h4><p>{resource.matchReason}</p></section>
    <section><h4>Tags</h4><div className="tags">{resource.tags.map(t=><span key={t}>{t}</span>)}</div><p className="url">{resource.sourceUrl.replace("https://","")}</p></section>
    <div className="drawer-actions"><button className="primary" onClick={()=>onToast("Trong phiên bản thật, hệ thống sẽ mở bài đăng hoặc tài liệu gốc.")}>Mở tài liệu gốc ↗</button><button className="secondary" onClick={copy}>Sao chép link</button></div>
    <section className="feedback"><h4>Tài liệu này có đúng thứ bạn cần không?</h4><div><button disabled={sent} onClick={()=>feedback(true)}>👍 Phù hợp</button><button disabled={sent} onClick={()=>feedback(false)}>👎 Không phù hợp</button></div>{sent&&<small>Phản hồi của bạn đã được ghi nhận.</small>}</section>
  </aside></div>;
}

function Home({search}:{search:(q:string)=>void}) {
  return <main><section className="hero"><div className="eyebrow"><span></span> TRI THỨC KHÓA HỌC, Ở MỘT NƠI</div><h1>Tìm lại tài liệu Discord<br/>mà không cần nhớ <em>nó nằm ở đâu</em></h1><p>Nhập điều bạn đang cần. Hệ thống sẽ tìm trong kho slide, bài lab, video, GitHub và thông báo đã được chia sẻ trong khóa học.</p><SearchBar onSearch={search}/><div className="suggestions"><b>Thử tìm nhanh:</b>{suggestions.map(q=><button key={q} onClick={()=>search(q)}>{q} <span>↗</span></button>)}</div>
    <div className="stats"><div><b>12</b><span>Tài liệu đã gom</span></div><div><b>5</b><span>Kênh Discord</span></div><div><b>6</b><span>Loại nội dung</span></div><div><b>&lt; 1s</b><span>Thời gian tìm kiếm</span></div></div></section></main>;
}

export default function Page() {
  const path=typeof window==="undefined"?"/":window.location.pathname;
  const [route,setRoute]=useState(path==="/resources"?"resources":path==="/search"?"search":"home");
  const [query,setQuery]=useState(typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("q")||"");
  const [loading,setLoading]=useState(route==="search");
  const [filters,setFilters]=useState<Filters>(defaultFilters);
  const [selected,setSelected]=useState<Resource|null>(null);
  const [toast,setToast]=useState("");
  const navigate=(p:string)=>{history.pushState({}, "", p);syncRoute()};
  const syncRoute=()=>{const p=location.pathname;setRoute(p==="/resources"?"resources":p==="/search"?"search":"home");setQuery(new URLSearchParams(location.search).get("q")||"");setFilters(defaultFilters);setSelected(null)};
  useEffect(()=>{addEventListener("popstate",syncRoute);return()=>removeEventListener("popstate",syncRoute)},[]);
  useEffect(()=>{if(route==="search"){if(!query){navigate("/");return}setLoading(true);const t=setTimeout(()=>setLoading(false),650);return()=>clearTimeout(t)}},[route,query]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),2800);return()=>clearTimeout(t)}},[toast]);
  const performSearch=(q:string)=>{setQuery(q);history.pushState({}, "", `/search?q=${encodeURIComponent(q)}`);setRoute("search");setFilters(defaultFilters)};
  const base=route==="search"?searchResources(query):resources;
  const shown=useMemo(()=>{let list=base.filter(r=>(filters.type==="all"||r.type===filters.type)&&(filters.topic==="all"||r.topic===filters.topic)&&(filters.channel==="all"||r.sourceChannel===filters.channel));return [...list].sort((a,b)=>filters.sortBy==="newest"?b.sharedAt.localeCompare(a.sharedAt):filters.sortBy==="oldest"?a.sharedAt.localeCompare(b.sharedAt):filters.sortBy==="title"?a.title.localeCompare(b.title,"vi"):(b.relevanceScore??0)-(a.relevanceScore??0))},[base,filters]);
  const activeCount=[filters.type,filters.topic,filters.channel].filter(v=>v!=="all").length;
  return <><AppHeader route={route} navigate={navigate}/>{route==="home"?<Home search={performSearch}/>:<main className="listing"><div className="page-title"><span className="eyebrow">{route==="search"?"KẾT QUẢ TÌM KIẾM":"THƯ VIỆN KHÓA HỌC"}</span><h1>{route==="search"?<>Tài liệu phù hợp với nhu cầu của bạn</>:"Kho tài liệu"}</h1><p>{route==="search"?<>Kết quả cho “<b>{query}</b>”</>:"Tất cả tài liệu đã được gom và phân loại từ các kênh của khóa học."}</p>{route==="search"&&<SearchBar initial={query} onSearch={performSearch} compact/>}</div>
      {loading?<div className="loading"><div className="spinner"></div><h2>Đang tìm trong kho tài liệu…</h2><p>Chúng tôi đang đối chiếu nhu cầu của bạn với các nguồn đã lưu.</p><div className="skeletons">{[1,2,3].map(i=><div className="skeleton" key={i}></div>)}</div></div>:
      <div className="results-layout"><FilterPanel filters={filters} setFilters={setFilters} showRelevance={route==="search"}/><section className="results"><div className="results-head"><div><b>{shown.length} tài liệu</b>{activeCount>0&&<span>{activeCount} bộ lọc đang dùng</span>}</div><small>{route==="search"?"Hiển thị tối đa 5 kết quả phù hợp nhất":"Dữ liệu demo nội bộ"}</small></div>
        {shown.length?<div className={route==="resources"?"resource-grid":""}>{shown.map(r=><ResourceCard key={r.id} resource={r} onDetail={()=>setSelected(r)} onSource={()=>setToast("Trong phiên bản thật, hệ thống sẽ mở bài đăng hoặc tài liệu gốc.")}/>)}</div>:<EmptyState clear={()=>setFilters(defaultFilters)} navigate={navigate}/>}
      </section></div>}</main>}{selected&&<Drawer resource={selected} query={query||"Kho tài liệu"} onClose={()=>setSelected(null)} onToast={setToast}/>} {toast&&<div className="toast" role="status">✓ {toast}</div>}<footer><span>Discord Knowledge Hub</span><small>Prototype CP2 • Dữ liệu mô phỏng, không kết nối Discord</small></footer></>;
}
