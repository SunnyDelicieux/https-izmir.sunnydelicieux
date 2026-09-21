const gallery=document.getElementById("gallery"),
pagination=document.getElementById("gallery-pagination"),
prevBtn=document.getElementById("gallery-prev"),
nextBtn=document.getElementById("gallery-next"),
pageList=document.getElementById("gallery-page-list"),
zoom=document.getElementById("zoom"),
zoomImg=document.getElementById("zoom-img"),
zoomTags=document.getElementById("zoom-tags"),
zoomDesc=document.getElementById("zoom-desc"),
zoomCounter=document.getElementById("zoom-counter"),
zoomPrev=document.getElementById("zoom-prev"),
zoomNext=document.getElementById("zoom-next"),
characterFilters=document.getElementById("character-filters"),
galleryTitle=document.getElementById("gallery-title");

const perPage=15;

let currentTag="",
    currentPage=1,
    zoomItem=null,
    zoomImage=null,
    zoomPage=0;


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
        ["calliope","Calliope","callioppe","calioppe"]
    ],

    autre:[
        ["camil","Camil","camille"],
        ["kushi","Kushi"],
        ["meryem","Meryem"]
    ],

    lasombra:[
        ["idia","Idia"],
        ["nour","Nour"]
    ]
};

const clean=t=>String(t||"").trim().toLowerCase();

function pages(item){
    return item.pages?.length
        ? item.pages
        : [{src:item.src,alt:item.alt,desc:item.desc}];
}


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


function updateGalleryCount(){
    galleryTitle.textContent=`Galerie (${filteredItems().length})`;
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
                  img=document.createElement("img");

            card.className="gallery-card";

            img.src=p[0].src;
            img.alt=p[0].alt||"";

            if((item.tags||[]).map(clean).includes("spice"))
                img.classList.add("spice-blur");

            card.appendChild(img);

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
    updateGalleryCount();
}

document.querySelectorAll(".tag-btn").forEach(btn=>{
    btn.onclick=()=>{
        document.querySelectorAll(".tag-btn")
            .forEach(b=>b.classList.remove("active"));

        btn.classList.add("active");

        const tag=clean(btn.dataset.tag);

        if(characters[tag]){
            showCharacters(tag);
            currentTag=tag;
        }else{
            characterFilters.innerHTML="";
            currentTag=tag;
        }

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
    if(currentPage>1){
        currentPage--;
        renderGallery();
    }
};

nextBtn.onclick=()=>{
    const maxPage=Math.max(
        1,
        Math.ceil(filteredItems().length/perPage)
    );

    if(currentPage<maxPage){
        currentPage++;
        renderGallery();
    }
};


function renderZoom(){
    if(!zoomItem)return;

    const p=pages(zoomItem),
          page=p[zoomPage];

    zoomImg.src=page.src;
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
    zoomImage=card.querySelector("img");
    zoomImage.classList.remove("spice-blur");

    zoomItem=item;
    zoomPage=0;

    renderZoom();
    zoom.classList.add("open");
}

function closeZoom(){
    if(
        zoomImage &&
        (zoomItem?.tags||[]).map(clean).includes("spice")
    ){
        zoomImage.classList.add("spice-blur");
    }

    zoomImage=null;
    zoomItem=null;
    zoomPage=0;

    zoom.classList.remove("open");
}

function changeZoomPage(direction){
    if(!zoomItem)return;

    const p=pages(zoomItem);

    if(p.length<2)return;

    zoomPage=
        (zoomPage+direction+p.length)%p.length;

    renderZoom();
}


zoom.onclick=e=>{
    if(e.target===zoom)
        closeZoom();
};

zoomPrev.onclick=e=>{
    e.stopPropagation();
    changeZoomPage(-1);
};

zoomNext.onclick=e=>{
    e.stopPropagation();
    changeZoomPage(1);
};

document.onkeydown=e=>{
    if(e.key==="Escape"){
        closeZoom();
        return;
    }

    if(!zoom.classList.contains("open"))
        return;

    if(e.key==="ArrowLeft")
        changeZoomPage(-1);

    if(e.key==="ArrowRight")
        changeZoomPage(1);
};


renderGallery();