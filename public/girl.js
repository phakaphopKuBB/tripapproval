const socket = io();
const list = document.getElementById('list'); const currentUser = 'thanida';
function loadProfile() { fetch('/api/profiles').then(r=>r.json()).then(d => { if(d.thanida) document.getElementById('my-avatar').src = d.thanida; }); } loadProfile();
function uploadProfile(i) { if(i.files[0]) { const r = new FileReader(); r.onload = e => { document.getElementById('my-avatar').src = e.target.result; socket.emit('update_profile', {username:currentUser, avatar:e.target.result}); Swal.fire({icon:'success', title:'สวยมากค่ะ!', showConfirmButton:false, timer:1000}); }; r.readAsDataURL(i.files[0]); } }
socket.on('profile_updated', d => { if(d.username === currentUser) document.getElementById('my-avatar').src = d.avatar; });

fetch('/api/history').then(r=>r.json()).then(d => { list.innerHTML = ''; d.forEach(renderTicket); });
socket.on('new_request', d => { renderTicket(d); window.scrollTo(0,0); new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{}); Swal.fire({title:'มีคำขอใหม่!', text:d.place, icon:'info', confirmButtonColor:'#db2777', timer:3000}); });

async function setStatus(id, s) {
    if(s==='approved') { Swal.fire({title:'อนุญาตให้ไป?', icon:'question', showCancelButton:true, confirmButtonText:'อนุญาต', confirmButtonColor:'#10b981'}).then(r => { if(r.isConfirmed) { socket.emit('update_status', {id, status:s, rejection_reason:null}); Swal.fire({title:'บันทึกแล้ว', icon:'success', showConfirmButton:false, timer:1000}); } }); }
    else { const {value:t} = await Swal.fire({title:'ไม่อนุญาตเพราะ?', input:'textarea', inputPlaceholder:'ใส่เหตุผล...', showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:'ยืนยัน'}); if(t) { socket.emit('update_status', {id, status:s, rejection_reason:t}); Swal.fire({title:'ส่งผลการตัดสินแล้ว', icon:'success', showConfirmButton:false, timer:1000}); } }
}
socket.on('status_changed', d => {
    const t = document.getElementById(`t-${d.id}`); if(t) {
        const b = t.querySelector('.status-badge'); b.className=`status-badge px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${d.status==='approved'?'bg-emerald-100 text-emerald-700':(d.status==='rejected'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700')}`; b.innerHTML = (d.status==='approved'?'<i class="fa-solid fa-circle-check"></i>':(d.status==='rejected'?'<i class="fa-solid fa-circle-xmark"></i>':'<i class="fa-solid fa-circle-pause"></i>')) + ' ' + d.status; t.querySelector('.actions')?.remove();
        if(d.status==='rejected' && !t.querySelector('.rejection-display')) t.querySelector('.ticket-body').insertAdjacentHTML('beforeend', `<div class="rejection-display mt-3 bg-rose-50 text-rose-700 p-3 rounded-xl text-sm border border-rose-100"><i class="fa-solid fa-comment-slash"></i> เหตุผล: ${d.rejection_reason}</div>`);
    }
});
socket.on('proof_updated', d => { const g = document.getElementById(`proof-gallery-${d.id}`); if(g) { g.innerHTML = d.images.map(s => `<div class="aspect-square rounded-lg overflow-hidden border border-pink-200 cursor-pointer" onclick="Swal.fire({imageUrl:'${s}', showConfirmButton:false, background:'transparent'})"><img src="${s}" class="w-full h-full object-cover"></div>`).join(''); g.classList.remove('hidden'); Swal.fire({title:'หลักฐานมาแล้ว!', text:`มี ${d.images.length} รูป`, icon:'success'}); } });
function renderTicket(d) {
    let imgs = []; try { imgs = JSON.parse(d.proof_image)||[]; if(!Array.isArray(imgs)) imgs=[d.proof_image]; } catch(e){ if(d.proof_image) imgs=[d.proof_image]; }
    const isPending = d.status==='pending', isRej = d.status==='rejected', hasImg = imgs.length>0;
    list.insertAdjacentHTML('afterbegin', `
    <div class="bg-white rounded-[20px] p-5 md:p-6 shadow-sm border border-pink-100 fade-in relative overflow-hidden" id="t-${d.id}">
        <div class="ticket-body">
            <div class="flex justify-between items-start mb-4 relative z-10"><div><div class="text-[10px] text-pink-400 font-medium mb-0.5">REQ #${d.id}</div><h4 class="font-bold text-slate-800 text-lg md:text-xl">${d.place}</h4></div><span class="status-badge px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${d.status==='approved'?'bg-emerald-100 text-emerald-700':(isRej?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700')}">${d.status==='approved'?'<i class="fa-solid fa-circle-check"></i>':(isRej?'<i class="fa-solid fa-circle-xmark"></i>':'<i class="fa-solid fa-circle-pause"></i>')} ${d.status}</span></div>
            <div class="space-y-2 text-sm text-slate-600 relative z-10 pl-2 border-l-2 border-pink-200 my-4">
                <div class="flex items-center gap-2"><i class="fa-regular fa-calendar text-pink-400 w-5 text-center"></i> ${d.start_time} - ${d.end_time}</div>
                <div class="flex items-center gap-2"><i class="fa-solid fa-stopwatch text-pink-400 w-5 text-center"></i> รวม ${d.duration}</div>
                <div class="flex items-center gap-2"><i class="fa-solid fa-coins text-pink-400 w-5 text-center"></i> งบ ${d.budget} บาท</div>
            </div>
            <div class="mt-3 bg-pink-50 p-3 rounded-xl text-pink-800 text-sm italic relative z-10 flex gap-2 items-start"><i class="fa-solid fa-heart text-pink-400 mt-1"></i><span>"${d.reason}"</span></div>
            ${isRej ? `<div class="rejection-display mt-3 bg-rose-50 text-rose-700 p-3 rounded-xl text-sm border border-rose-100"><i class="fa-solid fa-comment-slash"></i> เหตุผล: ${d.rejection_reason||'-'}</div>` : ''}
            ${isPending ? `<div class="actions grid grid-cols-2 gap-3 mt-5 relative z-10"><button onclick="setStatus(${d.id}, 'approved')" class="py-2.5 bg-emerald-500 text-white rounded-xl font-bold shadow-sm text-sm"><i class="fa-solid fa-check"></i> อนุญาต</button><button onclick="setStatus(${d.id}, 'rejected')" class="py-2.5 bg-rose-500 text-white rounded-xl font-bold shadow-sm text-sm"><i class="fa-solid fa-xmark"></i> ไม่ให้</button></div>` : ''}
            <div id="proof-gallery-${d.id}" class="mt-5 ${hasImg?'':'hidden'} relative z-10"><h5 class="text-slate-700 font-semibold mb-2 flex items-center gap-2 text-xs md:text-sm"><i class="fa-solid fa-images text-pink-500"></i> หลักฐาน (${imgs.length})</h5><div class="grid grid-cols-3 gap-2">${imgs.map(s=>`<div class="aspect-square rounded-lg overflow-hidden border border-pink-200 cursor-pointer" onclick="Swal.fire({imageUrl:'${s}', showConfirmButton:false, background:'transparent'})"><img src="${s}" class="w-full h-full object-cover"></div>`).join('')}</div></div>
        </div>
        <div class="absolute top-0 right-0 -mt-2 -mr-2 text-pink-50 opacity-40 text-8xl pointer-events-none"><i class="fa-solid fa-heart"></i></div>
    </div>`);
}