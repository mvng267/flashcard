from __future__ import annotations

import re
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import LibraryCard, LibraryDeck


WORD_RE = re.compile(r"^[A-Za-z]+$")


NEW_SINGLE_WORD_DECKS: list[dict] = [
    {
        "title": "Single Word Core A1",
        "description": "Từ đơn nền tảng A1, dễ nhớ, có IPA đầy đủ.",
        "level": "A1",
        "topic": "Core Vocabulary",
        "tags": "single-word,phonetic,a1,new",
        "estimated_minutes": 20,
        "cards": [
            ("apple", "quả táo", "I eat an apple every morning.", "ˈæp.əl"),
            ("bread", "bánh mì", "She bought fresh bread today.", "bred"),
            ("chair", "cái ghế", "Please sit on this chair.", "tʃer"),
            ("clock", "đồng hồ", "The clock is on the wall.", "klɑːk"),
            ("cloud", "đám mây", "A dark cloud is moving fast.", "klaʊd"),
            ("door", "cánh cửa", "Close the door quietly.", "dɔːr"),
            ("flower", "bông hoa", "This flower smells nice.", "ˈflaʊ.ɚ"),
            ("garden", "khu vườn", "My grandmother has a garden.", "ˈɡɑːr.dən"),
            ("key", "chìa khóa", "I cannot find my key.", "kiː"),
            ("light", "ánh sáng", "Turn on the light, please.", "laɪt"),
            ("mirror", "gương", "He looked in the mirror.", "ˈmɪr.ɚ"),
            ("mountain", "núi", "They climbed the mountain yesterday.", "ˈmaʊn.tən"),
            ("river", "con sông", "The river is very wide.", "ˈrɪv.ɚ"),
            ("room", "căn phòng", "My room is tidy.", "ruːm"),
            ("shirt", "áo sơ mi", "He wears a white shirt.", "ʃɝːt"),
            ("shoe", "giày", "This shoe is too small.", "ʃuː"),
            ("street", "đường phố", "The street is crowded tonight.", "striːt"),
            ("window", "cửa sổ", "Open the window for fresh air.", "ˈwɪn.doʊ"),
            ("yellow", "màu vàng", "Yellow is my favorite color.", "ˈjel.oʊ"),
            ("zebra", "ngựa vằn", "We saw a zebra at the zoo.", "ˈziː.brə"),
        ],
    },
    {
        "title": "Single Word Daily Verbs A1-A2",
        "description": "Động từ thông dụng dạng từ đơn, dùng hằng ngày.",
        "level": "A2",
        "topic": "Daily Actions",
        "tags": "single-word,phonetic,verbs,a2,new",
        "estimated_minutes": 22,
        "cards": [
            ("agree", "đồng ý", "I agree with your idea.", "əˈɡriː"),
            ("arrive", "đến", "We arrived early this morning.", "əˈraɪv"),
            ("ask", "hỏi", "Please ask your teacher.", "æsk"),
            ("borrow", "mượn", "Can I borrow your pen?", "ˈbɑːr.oʊ"),
            ("choose", "chọn", "You can choose any seat.", "tʃuːz"),
            ("clean", "làm sạch", "I clean my desk every day.", "kliːn"),
            ("cook", "nấu ăn", "My father can cook well.", "kʊk"),
            ("decide", "quyết định", "She decided to stay home.", "dɪˈsaɪd"),
            ("enjoy", "thích", "I enjoy reading fiction.", "ɪnˈdʒɔɪ"),
            ("explain", "giải thích", "Can you explain this rule?", "ɪkˈspleɪn"),
            ("finish", "hoàn thành", "I will finish this task soon.", "ˈfɪn.ɪʃ"),
            ("forget", "quên", "Do not forget your homework.", "fɚˈɡet"),
            ("invite", "mời", "We invited her to dinner.", "ɪnˈvaɪt"),
            ("learn", "học", "Children learn quickly.", "lɝːn"),
            ("listen", "lắng nghe", "Listen carefully to the audio.", "ˈlɪs.ən"),
            ("notice", "nhận ra", "I noticed a small mistake.", "ˈnoʊ.tɪs"),
            ("practice", "luyện tập", "You should practice every day.", "ˈpræk.tɪs"),
            ("remember", "nhớ", "I remember his name.", "rɪˈmem.bɚ"),
            ("travel", "du lịch", "They travel abroad yearly.", "ˈtræv.əl"),
            ("visit", "thăm", "We will visit our friends.", "ˈvɪz.ɪt"),
        ],
    },
    {
        "title": "Single Word Nature A2",
        "description": "Từ đơn về thiên nhiên và thời tiết, đầy đủ IPA.",
        "level": "A2",
        "topic": "Nature",
        "tags": "single-word,phonetic,nature,a2,new",
        "estimated_minutes": 22,
        "cards": [
            ("autumn", "mùa thu", "Autumn is cool and dry.", "ˈɔː.təm"),
            ("breeze", "gió nhẹ", "A soft breeze touched my face.", "briːz"),
            ("climate", "khí hậu", "The climate is changing rapidly.", "ˈklaɪ.mət"),
            ("desert", "sa mạc", "The desert is extremely hot.", "ˈdez.ɚt"),
            ("forest", "rừng", "The forest is rich in wildlife.", "ˈfɔːr.ɪst"),
            ("frost", "sương giá", "There was frost on the grass.", "frɔːst"),
            ("humid", "ẩm", "Today feels very humid.", "ˈhjuː.mɪd"),
            ("island", "hòn đảo", "They live on a small island.", "ˈaɪ.lənd"),
            ("jungle", "rừng rậm", "The jungle is dense and wild.", "ˈdʒʌŋ.ɡəl"),
            ("lightning", "tia chớp", "Lightning flashed across the sky.", "ˈlaɪt.nɪŋ"),
            ("ocean", "đại dương", "The ocean looks calm today.", "ˈoʊ.ʃən"),
            ("rain", "mưa", "Heavy rain started at noon.", "reɪn"),
            ("shadow", "bóng", "My shadow is on the ground.", "ˈʃæd.oʊ"),
            ("snow", "tuyết", "Snow covered the street overnight.", "snoʊ"),
            ("storm", "cơn bão", "A strong storm hit the coast.", "stɔːrm"),
            ("thunder", "sấm", "We heard loud thunder outside.", "ˈθʌn.dɚ"),
            ("valley", "thung lũng", "The village lies in a valley.", "ˈvæl.i"),
            ("weather", "thời tiết", "The weather is pleasant today.", "ˈweð.ɚ"),
            ("wind", "gió", "The wind is getting stronger.", "wɪnd"),
            ("winter", "mùa đông", "Winter is my favorite season.", "ˈwɪn.tɚ"),
        ],
    },
    {
        "title": "Single Word Work B1",
        "description": "Từ đơn chủ đề công việc và kinh doanh ở mức B1.",
        "level": "B1",
        "topic": "Work",
        "tags": "single-word,phonetic,work,b1,new",
        "estimated_minutes": 24,
        "cards": [
            ("agenda", "chương trình", "We discussed the agenda first.", "əˈdʒen.də"),
            ("budget", "ngân sách", "The budget is limited this quarter.", "ˈbʌdʒ.ɪt"),
            ("client", "khách hàng", "Our client requested changes.", "ˈklaɪ.ənt"),
            ("colleague", "đồng nghiệp", "My colleague helped me today.", "ˈkɑː.liːɡ"),
            ("company", "công ty", "The company is expanding quickly.", "ˈkʌm.pə.ni"),
            ("demand", "nhu cầu", "Demand increased last month.", "dɪˈmænd"),
            ("finance", "tài chính", "She works in finance.", "ˈfaɪ.næns"),
            ("income", "thu nhập", "His income is stable now.", "ˈɪn.kʌm"),
            ("market", "thị trường", "The market is highly competitive.", "ˈmɑːr.kɪt"),
            ("meeting", "cuộc họp", "The meeting starts at nine.", "ˈmiː.tɪŋ"),
            ("offer", "đề nghị", "They made a good offer.", "ˈɔː.fɚ"),
            ("profit", "lợi nhuận", "Our profit rose this year.", "ˈprɑː.fɪt"),
            ("project", "dự án", "This project needs more time.", "ˈprɑː.dʒekt"),
            ("report", "báo cáo", "I submitted the report yesterday.", "rɪˈpɔːrt"),
            ("salary", "lương", "Her salary is quite competitive.", "ˈsæl.ɚ.i"),
            ("strategy", "chiến lược", "We need a better strategy.", "ˈstræt̬.ə.dʒi"),
            ("supply", "nguồn cung", "Supply remains low this week.", "səˈplaɪ"),
            ("team", "đội nhóm", "Our team worked very hard.", "tiːm"),
            ("value", "giá trị", "This product offers real value.", "ˈvæl.juː"),
            ("worker", "người lao động", "Every worker attended the training.", "ˈwɝː.kɚ"),
        ],
    },
    {
        "title": "Single Word Academic B2",
        "description": "Từ đơn học thuật thường gặp, có phiên âm đầy đủ.",
        "level": "B2",
        "topic": "Academic",
        "tags": "single-word,phonetic,academic,b2,new",
        "estimated_minutes": 24,
        "cards": [
            ("analyze", "phân tích", "We need to analyze the results.", "ˈæn.əl.aɪz"),
            ("argument", "lập luận", "His argument is convincing.", "ˈɑːr.ɡjə.mənt"),
            ("concept", "khái niệm", "This concept is difficult at first.", "ˈkɑːn.sept"),
            ("context", "ngữ cảnh", "Meaning changes with context.", "ˈkɑːn.tekst"),
            ("data", "dữ liệu", "The data supports our theory.", "ˈdeɪ.tə"),
            ("evidence", "bằng chứng", "The evidence is reliable.", "ˈev.ɪ.dəns"),
            ("factor", "yếu tố", "Cost is a major factor.", "ˈfæk.tɚ"),
            ("hypothesis", "giả thuyết", "Their hypothesis was correct.", "haɪˈpɑː.θə.sɪs"),
            ("journal", "tạp chí", "The paper was published in a journal.", "ˈdʒɝː.nəl"),
            ("method", "phương pháp", "This method is easy to apply.", "ˈmeθ.əd"),
            ("objective", "mục tiêu", "Our objective is clear.", "əbˈdʒek.tɪv"),
            ("principle", "nguyên tắc", "He explained the principle simply.", "ˈprɪn.sə.pəl"),
            ("publish", "xuất bản", "They plan to publish soon.", "ˈpʌb.lɪʃ"),
            ("research", "nghiên cứu", "Research takes patience.", "rɪˈsɝːtʃ"),
            ("source", "nguồn", "Please cite your source.", "sɔːrs"),
            ("statistic", "thống kê", "This statistic is surprising.", "stəˈtɪs.tɪk"),
            ("theory", "lý thuyết", "The theory explains the trend.", "ˈθɪr.i"),
            ("variable", "biến số", "Control each variable carefully.", "ˈver.i.ə.bəl"),
            ("version", "phiên bản", "Use the latest version.", "ˈvɝː.ʒən"),
            ("volume", "khối lượng", "The volume increased rapidly.", "ˈvɑːl.juːm"),
        ],
    },
    {
        "title": "Single Word IELTS Booster B2-C1",
        "description": "Từ đơn nâng band IELTS, ưu tiên tính học thuật và ứng dụng nói/viết.",
        "level": "C1",
        "topic": "IELTS",
        "tags": "single-word,phonetic,ielts,c1,new",
        "estimated_minutes": 26,
        "cards": [
            ("abandon", "từ bỏ", "Many young people abandon old habits.", "əˈbæn.dən"),
            ("adequate", "đầy đủ", "Public transport is not adequate yet.", "ˈæd.ə.kwət"),
            ("allocate", "phân bổ", "The city should allocate more funds.", "ˈæl.ə.keɪt"),
            ("controversy", "tranh cãi", "The policy caused public controversy.", "ˈkɑːn.trə.vɝː.si"),
            ("decline", "suy giảm", "Air quality continues to decline.", "dɪˈklaɪn"),
            ("domestic", "nội địa", "Domestic demand is increasing.", "dəˈmes.tɪk"),
            ("enhance", "nâng cao", "Technology can enhance productivity.", "ɪnˈhæns"),
            ("ethical", "có đạo đức", "Ethical standards must be strict.", "ˈeθ.ɪ.kəl"),
            ("expand", "mở rộng", "The company plans to expand.", "ɪkˈspænd"),
            ("global", "toàn cầu", "Climate change is a global issue.", "ˈɡloʊ.bəl"),
            ("incentive", "động lực", "Tax cuts can be an incentive.", "ɪnˈsen.tɪv"),
            ("innovation", "đổi mới", "Innovation drives economic growth.", "ˌɪn.əˈveɪ.ʃən"),
            ("isolate", "cô lập", "Poor roads isolate rural areas.", "ˈaɪ.sə.leɪt"),
            ("legislate", "ban hành luật", "Governments should legislate quickly.", "ˈledʒ.ɪ.sleɪt"),
            ("migrate", "di cư", "Birds migrate every winter.", "ˈmaɪ.ɡreɪt"),
            ("priority", "ưu tiên", "Education remains a national priority.", "praɪˈɔːr.ə.t̬i"),
            ("regulate", "điều tiết", "Authorities must regulate emissions.", "ˈreɡ.jə.leɪt"),
            ("scarce", "khan hiếm", "Clean water is becoming scarce.", "skers"),
            ("stable", "ổn định", "A stable income reduces stress.", "ˈsteɪ.bəl"),
            ("sustainable", "bền vững", "We need sustainable solutions now.", "səˈsteɪ.nə.bəl"),
        ],
    },
]


def validate_cards(cards: list[tuple[str, str, str, str]], deck_title: str) -> None:
    for front, _, _, phonetic in cards:
        if not WORD_RE.match(front):
            raise ValueError(f"Deck '{deck_title}' có từ không phải từ đơn ASCII: '{front}'")
        if not phonetic or not phonetic.strip():
            raise ValueError(f"Deck '{deck_title}' thiếu phonetic ở từ '{front}'")


def upsert_single_word_decks(db: Session) -> tuple[int, int]:
    created_decks = 0
    created_cards = 0

    for deck_data in NEW_SINGLE_WORD_DECKS:
        cards = deck_data["cards"]
        validate_cards(cards, deck_data["title"])

        deck = db.query(LibraryDeck).filter(LibraryDeck.title == deck_data["title"]).first()
        if not deck:
            deck = LibraryDeck(
                title=deck_data["title"],
                description=deck_data["description"],
                level=deck_data["level"],
                topic=deck_data["topic"],
                tags=deck_data["tags"],
                estimated_minutes=deck_data["estimated_minutes"],
                is_public=True,
                created_at=datetime.utcnow(),
            )
            db.add(deck)
            db.flush()
            created_decks += 1

        existing_fronts = {
            row[0]
            for row in db.query(LibraryCard.front_text)
            .filter(LibraryCard.deck_id == deck.id)
            .all()
        }

        position_start = db.query(LibraryCard).filter(LibraryCard.deck_id == deck.id).count()
        next_pos = position_start

        for front, back, example, phonetic in cards:
            if front in existing_fronts:
                continue
            db.add(
                LibraryCard(
                    deck_id=deck.id,
                    position=next_pos,
                    front_text=front,
                    back_text=back,
                    example_sentence=example,
                    phonetic=phonetic,
                )
            )
            next_pos += 1
            created_cards += 1

    db.commit()
    return created_decks, created_cards


def main() -> None:
    db = SessionLocal()
    try:
        new_decks, new_cards = upsert_single_word_decks(db)
        print(f"Inserted decks: {new_decks}, inserted cards: {new_cards}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
