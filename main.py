from fastapi import FastAPI, Request, Form, Cookie
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse, HTMLResponse, Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import starlette.status as status
import random
from typing import Optional

import socketio
import copy


app = FastAPI()
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
runserver = socketio.ASGIApp(
    socketio_server=sio, other_asgi_app=app, socketio_path="/socket.io/"
)

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

players = {}

seotda_card = [
    "1a",
    "2a",
    "3a",
    "4a",
    "5a",
    "6a",
    "7a",
    "8a",
    "9a",
    "10a",
    "1b",
    "2b",
    "3b",
    "4b",
    "5b",
    "6b",
    "7b",
    "8b",
    "9b",
    "10b",
]

made = {
    1: ["3a", "8a"],
    2: ["9a", "4a"],
    3: ["1a", "3a"],
    4: ["1a", "8a"],
    5: ["9a", "4b"],
    6: ["1a", "1b"],
    7: ["2a", "2b"],
    8: ["3a", "3b"],
    9: ["4a", "4b"],
    10: ["5a", "5b"],
    11: ["6a", "6b"],
    12: ["7a", "7b"],
    13: ["8a", "8b"],
    14: ["9a", "9b"],
    15: ["10a", "10b"],
    16: ["1a", "2a"],
    17: ["1b", "2b"],
    18: ["1a", "4a"],
    19: ["1b", "4b"],
    20: ["1a", "9a"],
    21: ["1b", "9b"],
    22: ["1a", "10a"],
    23: ["1b", "10b"],
    24: ["4a", "10a"],
    25: ["4b", "10b"],
    26: ["4a", "6a"],
    27: ["4b", "6b"],
}


@app.get("/")
async def login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/")
def login(user_id: str = Form(...)):
    response = RedirectResponse("/board", status_code=status.HTTP_302_FOUND)
    response.set_cookie(key="user_id", value=user_id)
    print(user_id)
    return response


@app.get("/board")
async def board(request: Request, user_id: Optional[str] = Cookie(None)):
    return templates.TemplateResponse(
        "playing_board.html", {"request": request, "user_id": user_id}
    )


#### socket.io 설정 ####

## socket 연결
@sio.on("connect")
async def test(sid, environ, auth):
    print(sid, " 연결됨!")


## socket 연결해제
@sio.event
async def disconnect(sid):
    room = sio.rooms(sid)
    if len(room) == 2:
        for i in room:
            if i in players:
                room_name = i
        user_id = players[room_name]["user_info"].get(sid)
        del players[room_name]["user_info"][sid]
        players[room_name]["user_list"].remove(user_id)
        if len(players[room_name]["user_list"]) == 0:
            del players[room_name]
            print(room_name, "방 삭제됨")
        # 연결 해제 메세지 보냄
        await sio.emit(
            "chat_event",
            {
                "message": "[{}]님이 퇴장했습니다.".format(user_id),
                "code": "leave",
                "user_id": user_id,
            },
            room=room_name,
        )
        print(user_id, "삭제됨")


## 누군가 방 입장
@sio.event
async def join_room(sid, message):
    room = message.get("room")
    user_id = message.get("user_id")
    sio.enter_room(sid, room)
    await sio.emit(
        "chat_event",
        {
            "message": "[{}]님이 입장했습니다.".format(user_id),
            "code": "enter",
            "user_id": user_id,
        },
        room=room,
    )

    if room not in players:
        players[room] = {
            "user_list": [],
            "user_info": {},
            "in_game": False,
            "game_kind": "",
        }

    if sid not in players[room]["user_info"]:
        players[room]["user_info"][sid] = user_id
        players[room]["user_list"].append(user_id)

    print(players)
    await sio.emit(
        "in_the_room_player",
        {"user_list": players[room]["user_list"], "in_game": players[room]["in_game"]},
        room=message.get("room"),
        to=sid,
    )


## 누군가 채팅 보냄
@sio.event
async def chat_message(sid, message):
    await sio.emit(
        "chat_event",
        {
            "message": message.get("message"),
            "user_id": message.get("user_id"),
            "code": "chat_message",
        },
        room=message.get("room"),
        skip_sid=sid,
    )


## 누군가 게임 시작 버튼 눌렀을때
@sio.event
async def game_start(sid, message):
    print("게임시작", message)
    user_id = message.get("user_id")
    room = message.get("room")
    players[room]["in_game"] = True
    await sio.emit(
        "game_event",
        {"message": "[{}]님께서 게임을 시작했습니다.".format(user_id), "code": "game_start"},
        room=room,
    )


## 게임 세팅 후 확인 버튼 눌렀을때
@sio.event
async def set_game(sid, message):
    print("게임 세팅", message)
    user_id = message.get("user_id")
    room = message.get("room")
    game_kind = message.get("game_kind")
    is_take_bottom = message.get("is_take_bottom")

    players[room]["in_game"] = True
    players[room]["game_kind"] = game_kind
    new_cards = copy.deepcopy(seotda_card)
    random.shuffle(new_cards)
    if is_take_bottom:
        make_card = made[random.randrange(1, 27)]
        for card in make_card:
            new_cards.remove(card)
        await sio.emit(
            "take_cards",
            {
                "first": user_id,
                "is_take_bottom": is_take_bottom,
                "game_kind": game_kind,
                "seotda_card": new_cards,
                "made_card": make_card,
            },
            room=room,
        )
    else:
        await sio.emit(
            "take_cards",
            {
                "first": user_id,
                "is_take_bottom": is_take_bottom,
                "game_kind": game_kind,
                "seotda_card": new_cards,
            },
            room=room,
        )
