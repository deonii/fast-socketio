const socket = io();

// 누군가 게임 시작 버튼 눌렀을때
document.querySelector(".start_btn").addEventListener('click', function() {
  socket.emit('game_start', {room : room_code, user_id : user_id_incookie})
  console.log(room_code, user_id_incookie)
  Swal.fire({
    title: "Select game mode",
    html:
      '<select class="swal2-select" id="game_kind" style="display: flex;"><option value="basic_seotda">기본 섯다</option></select>' +
      '<label id="take_bottom" for="swal2-checkbox" class="swal2-checkbox" style="font-size: 1.125em;">밑장 빼기<input type="checkbox" value="1"></label>' +
      '<button type="button" id="set_game" class="swal2-confirm swal2-styled" aria-label="" style="display: inline-block;">OK</button>',
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
  })
  // 게임 종류 선택
  document.querySelector("#set_game").addEventListener('click',function () {
    let game_kind = document.querySelector('#game_kind').value
    let is_take_bottom = document.querySelector('#take_bottom').children[0].checked
    socket.emit('set_game', {game_kind: game_kind, is_take_bottom: is_take_bottom, user_id : user_id_incookie, room: room_code})
    Swal.clickConfirm();
    console.log('set_game')
  });
})

socket.on('take_cards', function(msg) {
  if (msg['is_take_bottom']) {
    console.log(msg, '밑장뺌')
  } else {
    console.log(msg, '밑장 안뺌')
  }
})



// 게임 시작 socket 메세지 받았을때
socket.on('game_event', function(msg) {
  if(msg['code'] == 'game_start') {
    document.querySelector("#notifyType").innerText = msg["message"];
    $(".notify").toggleClass("active");
    setTimeout(function () {
      $(".notify").removeClass("active");
      $("#notifyType").removeClass("success");
    }, 2000);
    document.querySelector(".start_btn").style.display = "none";
  }
})

// anime({
//   targets: "img",
//   translateY: 200,
//   translateX: 200,
//   //   function(){
//   //       anime.random(0,100);
//   //   },
//   rotate: function () {
//     return anime.random(-5, 5) + "turn";
//   },
//   duration: function () {
//     return anime.random(1200, 1800);
//   },
//   easing: "easeInElastic(1, .6)",
// });

// socket.io 설정

socket.on("connect", () => {
  console.log("connected :", socket.id);
});

let chat_cloud = document.querySelector(".chat_cloud");

// socket을 통한 메세지 받았을때
// 1. enter 누군가 입장 
// 2. chat_message 누군가로부터 메세지 받음
// 3. leave 누군가 퇴장
var enter_room = function(hand_num, user_id) {
  document.querySelector(".nick_" + hand_num).innerText = user_id;
  document.querySelector("#hand_" + hand_num + "_board").style.display = "block";
        user_info[user_id] = {
          hand_num: hand_num,
          seed: 3000000,
          left_finger: 5,
        };
        hand_info[hand_num] = user_id
}

socket.on("chat_event", function (message) {
  user_id = message['user_id']
  if (message["code"] == "enter") {
    let div1 = document.createElement("div");
    div1.className = "one_chat";
    let div2 = document.createElement("div");
    div2.className = "event_bubble";
    div2.innerText = message["message"];
    div1.appendChild(div2);
    chat_cloud.appendChild(div1);
    chat_scroll_down();
    if(user_id_incookie != user_id){
      if(Object.keys(hand_info).indexOf('2') < 0){
        enter_room(2, user_id)
        // document.querySelector("#hand_2_board").style.display = "block";
        // user_info[user_id] = {
        //   hand_num: 2,
        //   seed: 3000000,
        //   left_finger: 5,
        // };
        // hand_info[2] = user_id
        // document.querySelector(".nick_2").innerText = user_id;
      } else if (Object.keys(hand_info).indexOf('3') < 0){
        enter_room(3, user_id)
        // document.querySelector("#hand_3_board").style.display = "block";
        // user_info[user_id] = {
        //   hand_num: 3,
        //   seed: 3000000,
        //   left_finger: 5,
        // };
        // hand_info[3] = user_id
        // document.querySelector(".nick_3").innerText = user_id;
      }
    }
  }
  if (message["code"] == "chat_message") {
    let div1 = document.createElement("div");
    div1.className = "one_chat";
    let div2 = document.createElement("div");
    div2.className = "bubble_income";
    div2.innerHTML = "<b>" + user_id + "</b><br/>" + message["message"];
    div1.appendChild(div2);
    chat_cloud.appendChild(div1);
    chat_scroll_down();
  }
  if (message["code"] == "leave") {
    let div1 = document.createElement("div");
    div1.className = "one_chat";
    let div2 = document.createElement("div");
    div2.className = "event_bubble";
    div2.innerText = message["message"];
    div1.appendChild(div2);
    chat_cloud.appendChild(div1);
    chat_scroll_down();
    let hand_num = user_info[user_id]['hand_num']
    document.querySelector("#hand_" + hand_num + "_board").style.display = "none";
    delete user_info[user_id]
    delete hand_info[hand_num]
  }
});

// 처음 들어왔을때 기존 접속해있는 유저 정보
var already_in_user = function(list) {
  let hand_order = [2,3,1]
  let order = hand_order.slice(3 - list.length)
  for (var i =0; i<order.length; i++){
    document.querySelector("#hand_" + order[i] + "_board").style.display = "block"
    user_info[list[i]] ={
      hand_num: order[i],
      seed: 3000000,
      left_finger: 5,
    }
    hand_info[order[i]] = list[i]
    document.querySelector(".nick_"+ order[i]).innerText = list[0];
  }
}

socket.on("in_the_room_player", function(msg) {
  console.log(msg)
  already_in_user(msg['user_list'])
  
  // if(msg['user_list'].length == 1){
  //   document.querySelector("#hand_1_board").style.display = "block";
  //   user_info[msg["user_list"][0]] = {
  //       hand_num: 1,
  //       seed: 3000000,
  //       left_finger: 5,
  //   };
  //   hand_info[1] = msg["user_list"][0];

  // } else if (msg["user_list"].length == 2) {
  //   document.querySelector("#hand_1_board").style.display = "block";
  //   document.querySelector("#hand_3_board").style.display = "block";
  //   user_info[msg["user_list"][1]] = {
  //     hand_num: 1,
  //     seed: 3000000,
  //     left_finger: 5,
  //   };
  //   hand_info[1] = msg["user_list"][1];

  //   user_info[msg["user_list"][0]] = {
  //     hand_num: 3,
  //     seed: 3000000,
  //     left_finger: 5,
  //   };
  //   hand_info[3] = msg["user_list"][0];
  //   document.querySelector(".nick_3").innerText = msg["user_list"][0];

  // } else if (msg["user_list"].length == 3) {
  //   document.querySelector("#hand_1_board").style.display = "block";
  //   document.querySelector("#hand_2_board").style.display = "block";
  //   document.querySelector("#hand_3_board").style.display = "block";
  //   user_info[msg["user_list"][2]] = {
  //     hand_num: 1,
  //     seed: 3000000,
  //     left_finger: 5,
  //   };
  //   hand_info[1] = msg["user_list"][2];

  //   user_info[msg["user_list"][0]] = {
  //     hand_num: 2,
  //     seed: 3000000,
  //     left_finger: 5,
  //   };
  //   hand_info[2] = msg["user_list"][0];
  //   document.querySelector(".nick_2").innerText = msg["user_list"][0];

  //   user_info[msg["user_list"][1]] = {
  //     hand_num: 3,
  //     seed: 3000000,
  //     left_finger: 5,
  //   };
  //   hand_info[3] = msg["user_list"][1];
  //   document.querySelector(".nick_3").innerText = msg["user_list"][1];
  // }

    if (msg["in_game"]) {
      document.querySelector(".start_btn").style.display = "none";
    }
});


//메세지 보내는 함수 + 메세지 구름 생성
document.querySelector("#chatting_form").addEventListener("submit", function (e) {
  let msg = document.querySelector(".chatting_input");
  socket.emit("chat_message", { room: room_code, user_id: user_id_incookie, message: msg.value });

  let div1 = document.createElement("div");
  div1.className = "one_chat";
  let div2 = document.createElement("div");
  div2.className = "bubble_outgo";
  div2.innerHTML = "<b>" + user_id_incookie + "</b><br/>" + msg.value;
  div1.appendChild(div2);
  chat_cloud.appendChild(div1);
  chat_scroll_down();
  msg.value = "";
});

// 채팅시 하단으로 내려가는 함수
var chat_scroll_down = function () {
  $(".middle").scrollTop($(".middle")[0].scrollHeight);
};

// Room 입장
Swal.fire({
  title: "Room Code",
  icon: "info",
  input: "text",
  inputAttributes: {
    autocapitalize: "off",
  },
  confirmButtonText: "Check In",
  showLoaderOnConfirm: true,
  allowOutsideClick: false,
  allowEscapeKey: false,
}).then(result => {
  if (result.isConfirmed) {
    console.log(result.value);
    room_code = result.value;
    socket.emit("join_room", { room: room_code, user_id: user_id_incookie });
    Swal.fire(`Enter Room \n[${room_code}]`);
  }
});
