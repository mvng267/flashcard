from sqlalchemy.orm import Session

from app.models import LibraryCard, LibraryDeck


SEED_DECKS = [
    {
        "title": "Essential English A1",
        "description": "Từ vựng tiếng Anh cơ bản cho người mới bắt đầu.",
        "level": "A1",
        "topic": "Daily Life",
        "tags": "beginner,daily,essential",
        "estimated_minutes": 15,
        "cards": [
            ("hello", "xin chào", "Hello, how are you?", "həˈləʊ"),
            ("book", "quyển sách", "I read a book every night.", "bʊk"),
            ("water", "nước", "Please drink more water.", "ˈwɔːtər"),
            ("family", "gia đình", "My family is very supportive.", "ˈfæməli"),
            ("happy", "vui vẻ", "She feels happy today.", "ˈhæpi"),
            ("work", "làm việc", "I work from home.", "wɜːrk"),
            ("friend", "bạn bè", "He is my best friend.", "frend"),
            ("morning", "buổi sáng", "Good morning, teacher.", "ˈmɔːrnɪŋ"),
            ("school", "trường học", "The school is near my house.", "skuːl"),
            ("food", "thức ăn", "This food is delicious.", "fuːd"),
        ],
    },
    {
        "title": "Business Email Basics B1",
        "description": "Cụm từ quan trọng trong email công việc.",
        "level": "B1",
        "topic": "Business",
        "tags": "email,business,office",
        "estimated_minutes": 20,
        "cards": [
            ("regarding", "liên quan đến", "I am writing regarding your request.", "rɪˈɡɑːrdɪŋ"),
            ("attached", "đính kèm", "Please find the report attached.", "əˈtætʃt"),
            ("schedule", "lịch trình", "Can we confirm the schedule?", "ˈskedʒuːl"),
            ("deadline", "hạn chót", "The deadline is Friday.", "ˈdedlaɪn"),
            ("confirm", "xác nhận", "Please confirm your attendance.", "kənˈfɜːrm"),
            ("follow up", "theo dõi lại", "I will follow up next week.", "ˈfɒləʊ ʌp"),
            ("proposal", "đề xuất", "We reviewed your proposal.", "prəˈpəʊzl"),
            ("available", "có rảnh", "Are you available tomorrow?", "əˈveɪləbl"),
            ("meeting", "cuộc họp", "The meeting starts at 10 AM.", "ˈmiːtɪŋ"),
            ("appreciate", "đánh giá cao", "I appreciate your quick response.", "əˈpriːʃieɪt"),
        ],
    },
    {
        "title": "IELTS Speaking Band Booster B2",
        "description": "Từ/cụm nâng điểm nói IELTS chủ đề phổ biến.",
        "level": "B2",
        "topic": "IELTS",
        "tags": "ielts,speaking,intermediate",
        "estimated_minutes": 25,
        "cards": [
            ("sustainable", "bền vững", "We need sustainable solutions.", "səˈsteɪnəbl"),
            ("perspective", "góc nhìn", "From my perspective, it is effective.", "pərˈspektɪv"),
            ("overwhelming", "quá tải", "City life can be overwhelming.", "ˌəʊvərˈwelmɪŋ"),
            ("beneficial", "có lợi", "Exercise is beneficial to health.", "ˌbenɪˈfɪʃl"),
            ("maintain", "duy trì", "It is hard to maintain balance.", "meɪnˈteɪn"),
            ("significant", "đáng kể", "There is a significant increase.", "sɪɡˈnɪfɪkənt"),
            ("impact", "tác động", "Technology has a huge impact.", "ˈɪmpækt"),
            ("motivation", "động lực", "My motivation comes from family.", "ˌməʊtɪˈveɪʃn"),
            ("challenge", "thử thách", "Time management is a challenge.", "ˈtʃælɪndʒ"),
            ("flexible", "linh hoạt", "Remote work is more flexible.", "ˈfleksəbl"),
        ],
    },
]


def seed_library(db: Session) -> None:
    existing = db.query(LibraryDeck).count()
    if existing > 0:
        return

    for deck_data in SEED_DECKS:
        cards = deck_data.pop("cards")
        deck = LibraryDeck(**deck_data)
        db.add(deck)
        db.flush()

        for index, (front, back, example, phonetic) in enumerate(cards):
            db.add(
                LibraryCard(
                    deck_id=deck.id,
                    position=index,
                    front_text=front,
                    back_text=back,
                    example_sentence=example,
                    phonetic=phonetic,
                )
            )

    db.commit()
