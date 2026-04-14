from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, or_, update
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import DirectMessage, User
from app.schemas import ConversationPreview, MessageOut, MessageSendRequest

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/conversations", response_model=list[ConversationPreview])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sent_to = db.query(DirectMessage.receiver_id).filter(DirectMessage.sender_id == current_user.id).distinct().all()
    received_from = db.query(DirectMessage.sender_id).filter(DirectMessage.receiver_id == current_user.id).distinct().all()
    
    partner_ids = {r[0] for r in sent_to} | {r[0] for r in received_from}
    
    results = []
    for pid in partner_ids:
        partner = db.query(User).filter(User.id == pid).first()
        if not partner:
            continue
            
        last_msg = (
            db.query(DirectMessage)
            .filter(
                or_(
                    and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == pid),
                    and_(DirectMessage.sender_id == pid, DirectMessage.receiver_id == current_user.id),
                )
            )
            .order_by(desc(DirectMessage.created_at))
            .first()
        )
        
        if last_msg:
            results.append(
                ConversationPreview(
                    user_id=partner.id,
                    username=partner.username,
                    full_name=partner.full_name,
                    avatar_url=partner.avatar_url,
                    avatar_seed=partner.avatar_seed or partner.username,
                    last_message=last_msg.content[:100],
                    last_message_at=last_msg.created_at,
                )
            )
            
    return sorted(results, key=lambda x: x.last_message_at, reverse=True)


@router.get("/{user_id}", response_model=list[MessageOut])
def get_chat_history(
    user_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Mark messages as read when fetching history
    db.query(DirectMessage).filter(
        DirectMessage.sender_id == user_id,
        DirectMessage.receiver_id == current_user.id,
        DirectMessage.is_read == False,
    ).update({DirectMessage.is_read: True})
    db.commit()

    messages = (
        db.query(DirectMessage)
        .filter(
            or_(
                and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == user_id),
                and_(DirectMessage.sender_id == user_id, DirectMessage.receiver_id == current_user.id),
            )
        )
        .order_by(desc(DirectMessage.created_at))
        .limit(limit)
        .all()
    )
    
    return sorted(messages, key=lambda x: x.created_at)


@router.post("/send", response_model=MessageOut)
def send_message(
    payload: MessageSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.to_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể nhắn tin cho chính mình")
        
    receiver = db.query(User).filter(User.id == payload.to_user_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Người nhận không tồn tại")
        
    msg = DirectMessage(
        sender_id=current_user.id,
        receiver_id=payload.to_user_id,
        content=payload.content.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    return msg
