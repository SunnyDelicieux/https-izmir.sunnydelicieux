// ===== GRILLE =====

const gallery=document.getElementById("gallery"),
pagination=document.getElementById("gallery-pagination"),
prevBtn=document.getElementById("gallery-prev"),
nextBtn=document.getElementById("gallery-next"),
pageList=document.getElementById("gallery-page-list"),
galleryTitle=document.getElementById("gallery-title");

const perPage=15;

let currentPage=1;

const clean=t=>String(t||"").trim().toLowerCase();
const isVideo=src=>/\.(mp4|webm)$/i.test(src||"");

function pages(item){
    return item.pages?.length
        ? item.pages
        : [{src:item.src,alt:item.alt,desc:item.desc}];
}

function renderGallery(){
    const items=filteredItems(),
          maxPage=Math.max(1,Math.ceil(items.length/perPage));

    currentPage=Math.min(currentPage,maxPage);

    gallery.innerHTML="";

    items
        .slice(
            (currentPage-1)*perPage,
            currentPage*perPage
        )
        .forEach(item=>{
            const p=pages(item),
                  card=document.createElement("div"),
                  video=isVideo(p[0].src),
                  thumb=document.createElement(video?"video":"img");

            card.className="gallery-card";

            thumb.src=video?p[0].src+"#t=0.1":p[0].src;
            thumb.alt=p[0].alt||"";

            if((item.tags||[]).map(clean).includes("spice"))
                thumb.classList.add("spice-blur");

            card.appendChild(thumb);

            if(p.length>1){
                const badge=document.createElement("div");

                badge.className="gallery-comic-badge";
                badge.textContent=p.length;

                card.appendChild(badge);
            }

            card.onclick=()=>openZoom(card,item);

            gallery.appendChild(card);
        });

    renderPagination(items.length,maxPage);
    galleryTitle.textContent=`Galerie (${items.length})`;
}

// ===== PERSOS PAR CLAN =====

const characters={
    brujah:[
        ["baran","Baran"],
        ["kaadir","Kaadir"],
        ["enry","Enry","henry","enri"],
        ["emine","Emine"],
        ["gabriel","Gabriel"],
        ["aaron","Aaron"],
        ["essil","Essil"],
        ["anna","Anna","ana"],
        ["ahmet","Ahmet"]
    ],

    ventrue:[
       ["Zaya","zaya"],
        ["louiza","Louiza"],
        ["dimitri","Dimitri"],
        ["arslan","Arslan","kerem"],
        ["raffi","Raffi"],
        ["hadla","Hadla","adla"],
        ["alita","Alita"],
        ["thouros","Thouros"],
        ["cem","Cem"]
    ],

    tremere:[
        ["eleni","Eleni"],
        ["tarik","Tarik"],
        ["esen","Esen"],
        ["mariko","Mariko"],
        ["sophia","Sophia"],
        ["dimitrios","Dimitrios"],
        ["zacharias","Zacharias"],
        ["eylem","Eylem"],
        ["ismini","Ismini","issmini"]
    ],

    nosferatu:[
        ["inga","Inga"],
        ["atam","Atam"],
        ["nebetta","Nebetta"]
    ],

    toreador:[
        ["maliha","Maliha"],
        ["nafissa","Nafissa"],
        ["angelos","Angelos"],
        ["ines","Ines"],
        ["aylin","Aylin"],
        ["kejal","Kejal"],
        ["max","Max"],
        ["calliope","Calliope","callioppe","calioppe"],
        ["alejandro","Alejandro"],
    ],

    autre:[
        ["camil","Camil","camille"],
        ["kushi","Kushi"],
        ["meryem","Meryem"]
    ],

    lasombra:[
        ["idia","Idia"],
        ["nour","Nour"],
        ["ketevan","Ketevan"]    ]
};

// ===== FILTRES =====

const characterFilters=document.getElementById("character-filters");

let currentTag="";

function filteredItems(){
    if(!currentTag){
        return galleryData.filter(item=>
            !(item.tags||[]).map(clean).includes("spice")
        );
    }

    const wanted=(Array.isArray(currentTag)
        ? currentTag
        : [currentTag]
    ).map(clean);

    return galleryData.filter(item=>{
        const tags=(item.tags||[]).map(clean);

        if(wanted.includes("spice"))
            return tags.includes("spice");

        return !tags.includes("spice") &&
               wanted.some(tag=>tags.includes(tag));
    });
}

function showCharacters(clan){
    characterFilters.innerHTML="";

    characters[clan].forEach(([tag,name,...aliases])=>{
        const btn=document.createElement("button");

        btn.className="tag-btn";
        btn.textContent=name;

        btn.onclick=()=>{
            characterFilters
                .querySelectorAll(".tag-btn")
                .forEach(b=>b.classList.remove("active"));

            btn.classList.add("active");

            currentTag=[tag,...aliases];
            currentPage=1;

            renderGallery();
        };

        characterFilters.appendChild(btn);
    });
}

document.querySelectorAll(".tag-btn").forEach(btn=>{
    btn.onclick=()=>{
        document.querySelectorAll(".tag-btn")
            .forEach(b=>b.classList.remove("active"));

        btn.classList.add("active");

        const tag=clean(btn.dataset.tag);

        if(characters[tag])
            showCharacters(tag);
        else
            characterFilters.innerHTML="";

        currentTag=tag;
        currentPage=1;
        renderGallery();
    };
});

document.getElementById("reset-btn").onclick=()=>{
    document.querySelectorAll(".tag-btn")
        .forEach(b=>b.classList.remove("active"));

    characterFilters.innerHTML="";
    currentTag="";
    currentPage=1;

    renderGallery();
};

// ===== PAGINATION =====

function renderPagination(total,maxPage){
    pageList.innerHTML="";

    prevBtn.disabled=currentPage===1;
    nextBtn.disabled=currentPage===maxPage;

    for(let i=1;i<=maxPage;i++){
        const btn=document.createElement("button");

        btn.textContent=i;
        btn.className=i===currentPage?"active":"";

        btn.onclick=()=>{
            currentPage=i;
            renderGallery();
        };

        pageList.appendChild(btn);
    }

    pagination.style.display=
        total>perPage?"flex":"none";
}

prevBtn.onclick=()=>{
    currentPage--;
    renderGallery();
};

nextBtn.onclick=()=>{
    currentPage++;
    renderGallery();
};

// ===== ZOOM =====

const zoom=document.getElementById("zoom"),
zoomImg=document.getElementById("zoom-img"),
zoomVideo=document.getElementById("zoom-video"),
zoomTags=document.getElementById("zoom-tags"),
zoomDesc=document.getElementById("zoom-desc"),
zoomCounter=document.getElementById("zoom-counter"),
zoomPrev=document.getElementById("zoom-prev"),
zoomNext=document.getElementById("zoom-next");

let zoomItem=null,
    zoomThumb=null,
    zoomPage=0;

function renderZoom(){
    const p=pages(zoomItem),
          page=p[zoomPage],
          video=isVideo(page.src);

    zoomVideo.pause();
    zoomImg.hidden=video;
    zoomVideo.hidden=!video;
    (video?zoomVideo:zoomImg).src=page.src;
    zoomImg.alt=page.alt||"";

    zoomDesc.textContent=page.desc||"";

    zoomTags.innerHTML=(zoomItem.tags||[])
        .map(tag=>`<span class="zoom-tag">${tag}</span>`)
        .join("");

    zoomCounter.textContent=
        p.length>1
            ? `${zoomPage+1} / ${p.length}`
            : "";

    zoomPrev.disabled=zoomNext.disabled=p.length<2;
}

function openZoom(card,item){
    zoomThumb=card.firstElementChild;
    zoomThumb.classList.remove("spice-blur");

    zoomItem=item;
    zoomPage=0;

    renderZoom();
    zoom.classList.add("open");
}

function closeZoom(){
    if(!zoomItem)return;

    if((zoomItem.tags||[]).map(clean).includes("spice"))
        zoomThumb.classList.add("spice-blur");

    zoomVideo.pause();
    zoomItem=null;
    zoom.classList.remove("open");
}

function changeZoomPage(direction){
    if(!zoomItem)return;

    const total=pages(zoomItem).length;

    zoomPage=(zoomPage+direction+total)%total;
    renderZoom();
}

zoom.onclick=e=>{
    if(e.target===zoom)
        closeZoom();
};

zoomPrev.onclick=()=>changeZoomPage(-1);
zoomNext.onclick=()=>changeZoomPage(1);

document.onkeydown=e=>{
    if(e.key==="Escape")closeZoom();
    if(e.key==="ArrowLeft")changeZoomPage(-1);
    if(e.key==="ArrowRight")changeZoomPage(1);
};

renderGallery();