#!/usr/bin/env python3
"""
Generate a lot of realistic sample data for Flashcard app.

Usage:
  cd api
  source .venv/bin/activate
  python scripts/generate_sample_data.py --users 500 --decks-per-user 6 --days 180
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models import (  # noqa: E402
    ExerciseAnswer,
    ExerciseAttempt,
    LibraryCard,
    LibraryDeck,
    ReviewLog,
    User,
    UserCard,
    UserDeck,
)
from app.security import get_password_hash  # noqa: E402


FIRST_NAMES = [
    "An",
    "Binh",
    "Chi",
    "Dung",
    "Giang",
    "Huy",
    "Khanh",
    "Linh",
    "Minh",
    "Nam",
    "Phuong",
    "Quynh",
    "Trang",
    "Viet",
    "Yen",
    "Bao",
    "Dat",
    "Hai",
    "Kiet",
    "Lam",
    "My",
    "Nhi",
    "Phuc",
    "Son",
    "Tam",
    "Vy",
]

LAST_NAMES = [
    "Nguyen",
    "Tran",
    "Le",
    "Pham",
    "Hoang",
    "Phan",
    "Vu",
    "Dang",
    "Bui",
    "Do",
    "Duong",
    "Trinh",
    "Ngo",
    "Ly",
]


# Manual decks with richer examples / phonetics
BASE_LIBRARY_DECKS = [
    {
        "title": "Phrasal Verbs in Action B1",
        "description": "200 phrasal verbs thông dụng trong hội thoại thực tế.",
        "level": "B1",
        "topic": "Grammar",
        "tags": "phrasal,conversation,b1",
        "estimated_minutes": 30,
        "cards": [
            ("carry on", "tiếp tục", "Please carry on with your plan.", "ˈkæri ɒn"),
            ("figure out", "tìm ra", "I need to figure out this issue.", "ˈfɪɡjər aʊt"),
            ("give up", "từ bỏ", "Don’t give up too soon.", "ɡɪv ʌp"),
            ("look after", "chăm sóc", "She looks after her sister.", "lʊk ˈɑːftər"),
            ("set up", "thiết lập", "We set up a new office.", "set ʌp"),
            ("take off", "cất cánh", "The plane takes off at noon.", "teɪk ɒf"),
            ("turn down", "từ chối", "He turned down the offer.", "tɜːrn daʊn"),
            ("work out", "làm rõ / tập luyện", "Everything worked out well.", "wɜːrk aʊt"),
            ("run into", "tình cờ gặp", "I ran into my teacher yesterday.", "rʌn ˈɪntuː"),
            ("put off", "trì hoãn", "Don’t put off your homework.", "pʊt ɒf"),
        ],
    },
    {
        "title": "Travel English Essentials A2",
        "description": "Từ vựng cần thiết khi du lịch: sân bay, khách sạn, nhà hàng.",
        "level": "A2",
        "topic": "Travel",
        "tags": "travel,a2,speaking",
        "estimated_minutes": 18,
        "cards": [
            ("boarding pass", "thẻ lên máy bay", "Keep your boarding pass ready.", "ˈbɔːrdɪŋ pæs"),
            ("reservation", "đặt chỗ", "I have a reservation for two.", "ˌrezərˈveɪʃn"),
            ("luggage", "hành lý", "Where is the luggage claim area?", "ˈlʌɡɪdʒ"),
            ("passport", "hộ chiếu", "Please show your passport.", "ˈpæspɔːrt"),
            ("check in", "làm thủ tục", "We should check in now.", "tʃek ɪn"),
            ("departure", "khởi hành", "The departure gate is B12.", "dɪˈpɑːrtʃər"),
            ("arrival", "đến nơi", "What time is the arrival?", "əˈraɪvl"),
            ("single room", "phòng đơn", "I’d like a single room.", "ˈsɪŋɡl ruːm"),
            ("currency exchange", "đổi tiền", "Where is the currency exchange?", "ˈkʌrənsi ɪksˈtʃeɪndʒ"),
            ("sightseeing", "tham quan", "We went sightseeing all day.", "ˈsaɪtsiːɪŋ"),
        ],
    },
    {
        "title": "Academic Vocabulary C1",
        "description": "Bộ từ học thuật nâng cao cho IELTS/TOEFL và viết luận.",
        "level": "C1",
        "topic": "Academic",
        "tags": "academic,c1,ielts,toefl",
        "estimated_minutes": 35,
        "cards": [
            ("hypothesis", "giả thuyết", "The hypothesis was later confirmed.", "haɪˈpɒθəsɪs"),
            ("methodology", "phương pháp luận", "The paper explains its methodology.", "ˌmeθəˈdɒlədʒi"),
            ("empirical", "thực nghiệm", "We need empirical evidence.", "ɪmˈpɪrɪkl"),
            ("coherent", "mạch lạc", "Your argument is coherent.", "kəʊˈhɪərənt"),
            ("substantial", "đáng kể", "There is substantial progress.", "səbˈstænʃl"),
            ("constrain", "hạn chế", "Budget constraints affect the project.", "kənˈstreɪn"),
            ("implication", "hàm ý", "This has major implications.", "ˌɪmplɪˈkeɪʃn"),
            ("derive", "suy ra", "The result is derived from data.", "dɪˈraɪv"),
            ("allocate", "phân bổ", "We allocated more resources.", "ˈæləkeɪt"),
            ("framework", "khung", "Use this theoretical framework.", "ˈfreɪmwɜːrk"),
        ],
    },
    {
        "title": "TOEIC Office Communication B2",
        "description": "Từ vựng thường xuất hiện trong môi trường công sở và email nội bộ.",
        "level": "B2",
        "topic": "Business",
        "tags": "toeic,business,office,b2",
        "estimated_minutes": 22,
        "cards": [
            ("agenda", "chương trình họp", "Please review the agenda.", "əˈdʒendə"),
            ("minutes", "biên bản họp", "The minutes were sent yesterday.", "ˈmɪnɪts"),
            ("delegate", "ủy quyền", "She delegated the task to me.", "ˈdelɪɡeɪt"),
            ("invoice", "hóa đơn", "The invoice is due next week.", "ˈɪnvɔɪs"),
            ("shipment", "lô hàng", "The shipment arrived late.", "ˈʃɪpmənt"),
            ("procurement", "mua sắm", "Procurement approved the order.", "prəˈkjʊəmənt"),
            ("compliance", "tuân thủ", "Compliance is required.", "kəmˈplaɪəns"),
            ("stakeholder", "bên liên quan", "All stakeholders were informed.", "ˈsteɪkˌhəʊldər"),
            ("quarterly", "hàng quý", "Quarterly results look positive.", "ˈkwɔːrtərli"),
            ("escalate", "chuyển cấp xử lý", "Escalate this issue immediately.", "ˈeskəleɪt"),
        ],
    },
    {
        "title": "Everyday Conversations A1-A2",
        "description": "Mẫu câu giao tiếp thường ngày: chào hỏi, mua sắm, hỏi đường.",
        "level": "A2",
        "topic": "Conversation",
        "tags": "conversation,beginner,a1,a2",
        "estimated_minutes": 16,
        "cards": [
            ("How much is this?", "Cái này bao nhiêu tiền?", "How much is this shirt?", "haʊ mʌtʃ ɪz ðɪs"),
            ("Can you help me?", "Bạn có thể giúp tôi không?", "Can you help me with this bag?", "kæn juː help miː"),
            ("Where is the restroom?", "Nhà vệ sinh ở đâu?", "Excuse me, where is the restroom?", "wer ɪz ðə ˈrestruːm"),
            ("I don't understand", "Tôi không hiểu", "Sorry, I don't understand.", "aɪ dəʊnt ˌʌndəˈstænd"),
            ("Could you repeat that?", "Bạn có thể nhắc lại không?", "Could you repeat that, please?", "kʊd juː rɪˈpiːt ðæt"),
            ("I am looking for...", "Tôi đang tìm...", "I am looking for this address.", "aɪ əm ˈlʊkɪŋ fɔːr"),
            ("What time is it?", "Mấy giờ rồi?", "What time is it now?", "wɒt taɪm ɪz ɪt"),
            ("See you later", "Hẹn gặp lại", "See you later, have a nice day.", "siː juː ˈleɪtər"),
            ("Take care", "Giữ gìn sức khỏe", "Take care on your way home.", "teɪk keər"),
            ("Sounds good", "Nghe ổn đó", "Sounds good to me.", "saʊndz ɡʊd"),
        ],
    },
]


EXPANDED_DECK_BLUEPRINTS = [
    {
        "title": "IELTS Speaking - Education & Learning B2",
        "description": "Từ khóa quan trọng để nói và viết về giáo dục trong IELTS.",
        "level": "B2",
        "topic": "IELTS",
        "tags": "ielts,education,speaking,writing,b2",
        "estimated_minutes": 28,
        "terms": [
            ("curriculum design", "thiết kế chương trình học"),
            ("tuition fee", "học phí"),
            ("scholarship grant", "học bổng"),
            ("distance learning", "học từ xa"),
            ("learning outcome", "kết quả học tập"),
            ("academic integrity", "liêm chính học thuật"),
            ("exam pressure", "áp lực thi cử"),
            ("classroom interaction", "tương tác trong lớp"),
            ("critical thinking", "tư duy phản biện"),
            ("vocational pathway", "lộ trình nghề nghiệp"),
            ("educational equity", "công bằng giáo dục"),
            ("school governance", "quản trị trường học"),
        ],
    },
    {
        "title": "IELTS Writing - Environment & Sustainability C1",
        "description": "Từ vựng chủ đề môi trường, phát triển bền vững cho Task 2.",
        "level": "C1",
        "topic": "IELTS",
        "tags": "ielts,environment,sustainability,task2,c1",
        "estimated_minutes": 30,
        "terms": [
            ("carbon neutrality", "trung hòa carbon"),
            ("renewable resource", "tài nguyên tái tạo"),
            ("biodiversity conservation", "bảo tồn đa dạng sinh học"),
            ("waste management", "quản lý chất thải"),
            ("water scarcity", "thiếu nước"),
            ("environmental footprint", "dấu chân môi trường"),
            ("green technology", "công nghệ xanh"),
            ("sustainable transport", "giao thông bền vững"),
            ("habitat destruction", "phá hủy môi trường sống"),
            ("climate adaptation", "thích ứng khí hậu"),
            ("conservation policy", "chính sách bảo tồn"),
            ("ecological awareness", "nhận thức sinh thái"),
        ],
    },
    {
        "title": "IELTS Speaking - Technology & Innovation C1",
        "description": "Bộ từ về công nghệ, đổi mới cho phần discussion và opinion.",
        "level": "C1",
        "topic": "IELTS",
        "tags": "ielts,technology,innovation,c1",
        "estimated_minutes": 30,
        "terms": [
            ("artificial intelligence", "trí tuệ nhân tạo"),
            ("machine learning", "học máy"),
            ("digital literacy", "năng lực số"),
            ("cybersecurity risk", "rủi ro an ninh mạng"),
            ("data privacy", "quyền riêng tư dữ liệu"),
            ("algorithm transparency", "tính minh bạch thuật toán"),
            ("automation impact", "tác động tự động hóa"),
            ("virtual collaboration", "hợp tác trực tuyến"),
            ("digital addiction", "nghiện công nghệ"),
            ("misinformation spread", "lan truyền tin sai"),
            ("innovation ecosystem", "hệ sinh thái đổi mới"),
            ("technological disruption", "đột phá công nghệ"),
        ],
    },
    {
        "title": "IELTS Topic - Urban Development C1",
        "description": "Từ khóa về đô thị hóa, nhà ở, giao thông trong các bài IELTS.",
        "level": "C1",
        "topic": "IELTS",
        "tags": "ielts,urbanization,housing,transport,c1",
        "estimated_minutes": 29,
        "terms": [
            ("urban sprawl", "mở rộng đô thị tràn lan"),
            ("housing affordability", "khả năng chi trả nhà ở"),
            ("public infrastructure", "hạ tầng công cộng"),
            ("traffic congestion", "ùn tắc giao thông"),
            ("mixed-use zoning", "quy hoạch đa chức năng"),
            ("urban regeneration", "tái thiết đô thị"),
            ("pedestrian-friendly design", "thiết kế thân thiện người đi bộ"),
            ("mass transit system", "hệ thống giao thông công cộng"),
            ("population density", "mật độ dân số"),
            ("green urban planning", "quy hoạch đô thị xanh"),
            ("rental pressure", "áp lực giá thuê"),
            ("civic amenities", "tiện ích dân sinh"),
        ],
    },
    {
        "title": "IELTS Topic - Health & Wellbeing B2",
        "description": "Từ vựng sức khỏe thể chất/tinh thần cho phần speaking và writing.",
        "level": "B2",
        "topic": "IELTS",
        "tags": "ielts,health,wellbeing,b2",
        "estimated_minutes": 26,
        "terms": [
            ("preventive medicine", "y học dự phòng"),
            ("mental resilience", "khả năng phục hồi tinh thần"),
            ("sedentary behaviour", "lối sống ít vận động"),
            ("nutritional balance", "cân bằng dinh dưỡng"),
            ("sleep quality", "chất lượng giấc ngủ"),
            ("chronic illness", "bệnh mãn tính"),
            ("healthcare accessibility", "khả năng tiếp cận y tế"),
            ("stress management", "quản lý căng thẳng"),
            ("public health literacy", "hiểu biết sức khỏe cộng đồng"),
            ("physical inactivity", "thiếu vận động thể chất"),
            ("health inequality", "bất bình đẳng y tế"),
            ("wellness routine", "thói quen chăm sóc sức khỏe"),
        ],
    },
    {
        "title": "IELTS Topic - Economy & Work C1",
        "description": "Bộ từ cho chủ đề kinh tế, việc làm, phát triển xã hội.",
        "level": "C1",
        "topic": "IELTS",
        "tags": "ielts,economy,work,c1",
        "estimated_minutes": 31,
        "terms": [
            ("labor market", "thị trường lao động"),
            ("entrepreneurial mindset", "tư duy khởi nghiệp"),
            ("economic growth", "tăng trưởng kinh tế"),
            ("inflation pressure", "áp lực lạm phát"),
            ("fiscal policy", "chính sách tài khóa"),
            ("productivity gain", "gia tăng năng suất"),
            ("employment security", "sự ổn định việc làm"),
            ("income disparity", "chênh lệch thu nhập"),
            ("skill shortage", "thiếu hụt kỹ năng"),
            ("gig workforce", "lực lượng lao động thời vụ"),
            ("social mobility", "dịch chuyển xã hội"),
            ("financial resilience", "khả năng chống chịu tài chính"),
        ],
    },
    {
        "title": "IELTS Topic - Public Policy & Governance C1",
        "description": "Từ khóa nâng cao về chính sách công và quản trị nhà nước.",
        "level": "C1",
        "topic": "IELTS",
        "tags": "ielts,policy,governance,c1",
        "estimated_minutes": 32,
        "terms": [
            ("policy framework", "khung chính sách"),
            ("public expenditure", "chi tiêu công"),
            ("tax incentive", "ưu đãi thuế"),
            ("governance transparency", "minh bạch quản trị"),
            ("civic participation", "sự tham gia công dân"),
            ("regulatory compliance", "tuân thủ quy định"),
            ("policy implementation", "triển khai chính sách"),
            ("social welfare scheme", "chương trình an sinh"),
            ("political accountability", "trách nhiệm giải trình chính trị"),
            ("public consultation", "tham vấn cộng đồng"),
            ("legal reform", "cải cách pháp lý"),
            ("administrative efficiency", "hiệu quả hành chính"),
        ],
    },
    {
        "title": "IELTS Topic - Media & Culture C1",
        "description": "Từ vựng học thuật về truyền thông, văn hóa và ảnh hưởng xã hội.",
        "level": "C1",
        "topic": "IELTS",
        "tags": "ielts,media,culture,c1",
        "estimated_minutes": 28,
        "terms": [
            ("cultural identity", "bản sắc văn hóa"),
            ("media narrative", "narrative truyền thông"),
            ("public perception", "nhận thức công chúng"),
            ("artistic expression", "biểu đạt nghệ thuật"),
            ("cultural heritage", "di sản văn hóa"),
            ("audience engagement", "mức độ tương tác khán giả"),
            ("social commentary", "bình luận xã hội"),
            ("media literacy", "năng lực truyền thông"),
            ("cultural diversity", "đa dạng văn hóa"),
            ("value system", "hệ giá trị"),
            ("mainstream media", "truyền thông đại chúng"),
            ("creative sector", "ngành công nghiệp sáng tạo"),
        ],
    },
    {
        "title": "IELTS Topic - Crime & Public Safety C1",
        "description": "Từ khóa cho chủ đề tội phạm, luật pháp, an toàn cộng đồng.",
        "level": "C1",
        "topic": "IELTS",
        "tags": "ielts,crime,safety,c1",
        "estimated_minutes": 30,
        "terms": [
            ("crime prevention", "phòng chống tội phạm"),
            ("juvenile delinquency", "phạm pháp vị thành niên"),
            ("rehabilitation program", "chương trình cải tạo"),
            ("community policing", "cảnh sát cộng đồng"),
            ("judicial process", "quy trình tư pháp"),
            ("surveillance measure", "biện pháp giám sát"),
            ("sentencing policy", "chính sách tuyên án"),
            ("law enforcement", "thực thi pháp luật"),
            ("criminal behaviour", "hành vi phạm tội"),
            ("prison overcrowding", "quá tải nhà tù"),
            ("social deterrent", "yếu tố răn đe xã hội"),
            ("public safety", "an toàn công cộng"),
        ],
    },
    {
        "title": "IELTS Topic - Science & Research C1",
        "description": "Từ học thuật chuyên sâu cho chủ đề nghiên cứu và khoa học.",
        "level": "C1",
        "topic": "IELTS",
        "tags": "ielts,science,research,c1",
        "estimated_minutes": 31,
        "terms": [
            ("empirical evidence", "bằng chứng thực nghiệm"),
            ("research methodology", "phương pháp nghiên cứu"),
            ("peer review", "phản biện đồng cấp"),
            ("scientific literacy", "hiểu biết khoa học"),
            ("data interpretation", "diễn giải dữ liệu"),
            ("ethical approval", "phê duyệt đạo đức"),
            ("laboratory findings", "kết quả thí nghiệm"),
            ("theoretical model", "mô hình lý thuyết"),
            ("evidence-based practice", "thực hành dựa trên bằng chứng"),
            ("research funding", "nguồn tài trợ nghiên cứu"),
            ("innovation hub", "trung tâm đổi mới"),
            ("interdisciplinary study", "nghiên cứu liên ngành"),
        ],
    },
    {
        "title": "TOEIC Email & Correspondence B1",
        "description": "Từ vựng dùng trong email công việc và trao đổi chuyên nghiệp.",
        "level": "B1",
        "topic": "TOEIC",
        "tags": "toeic,email,office,b1",
        "estimated_minutes": 20,
        "terms": [
            ("formal greeting", "lời chào trang trọng"),
            ("email thread", "chuỗi email"),
            ("action item", "hạng mục cần thực hiện"),
            ("response deadline", "hạn phản hồi"),
            ("attached report", "báo cáo đính kèm"),
            ("follow-up note", "thư nhắc lại"),
            ("approval request", "yêu cầu phê duyệt"),
            ("clarification point", "điểm cần làm rõ"),
            ("confidential file", "tệp bảo mật"),
            ("cc recipient", "người nhận cc"),
            ("proofreading check", "kiểm tra lỗi văn bản"),
            ("professional tone", "giọng điệu chuyên nghiệp"),
        ],
    },
    {
        "title": "TOEIC Meetings & Project Flow B1",
        "description": "Cụm từ dùng trong họp nhóm, theo dõi tiến độ dự án.",
        "level": "B1",
        "topic": "TOEIC",
        "tags": "toeic,meeting,project,b1",
        "estimated_minutes": 21,
        "terms": [
            ("meeting facilitator", "người điều phối cuộc họp"),
            ("agenda alignment", "thống nhất chương trình họp"),
            ("project timeline", "tiến độ dự án"),
            ("milestone update", "cập nhật cột mốc"),
            ("risk assessment", "đánh giá rủi ro"),
            ("resource allocation", "phân bổ nguồn lực"),
            ("progress tracker", "công cụ theo dõi tiến độ"),
            ("task ownership", "người chịu trách nhiệm nhiệm vụ"),
            ("deliverable status", "trạng thái đầu ra"),
            ("kickoff session", "buổi khởi động dự án"),
            ("retrospective review", "đánh giá sau dự án"),
            ("discussion summary", "tóm tắt thảo luận"),
        ],
    },
    {
        "title": "TOEIC Sales & Marketing B2",
        "description": "Từ vựng bán hàng/marketing thường gặp trong đề TOEIC.",
        "level": "B2",
        "topic": "TOEIC",
        "tags": "toeic,sales,marketing,b2",
        "estimated_minutes": 24,
        "terms": [
            ("sales funnel", "phễu bán hàng"),
            ("lead qualification", "đánh giá khách hàng tiềm năng"),
            ("conversion metric", "chỉ số chuyển đổi"),
            ("target audience", "đối tượng mục tiêu"),
            ("campaign budget", "ngân sách chiến dịch"),
            ("product positioning", "định vị sản phẩm"),
            ("competitor analysis", "phân tích đối thủ"),
            ("customer persona", "chân dung khách hàng"),
            ("promotional offer", "ưu đãi khuyến mãi"),
            ("retention strategy", "chiến lược giữ chân khách hàng"),
            ("revenue projection", "dự báo doanh thu"),
            ("market share", "thị phần"),
        ],
    },
    {
        "title": "TOEIC HR & Recruitment B2",
        "description": "Bộ từ chuyên dụng cho tuyển dụng và quản trị nhân sự.",
        "level": "B2",
        "topic": "TOEIC",
        "tags": "toeic,hr,recruitment,b2",
        "estimated_minutes": 24,
        "terms": [
            ("job vacancy", "vị trí tuyển dụng"),
            ("candidate screening", "sàng lọc ứng viên"),
            ("interview schedule", "lịch phỏng vấn"),
            ("onboarding process", "quy trình hội nhập"),
            ("probation review", "đánh giá thử việc"),
            ("training workshop", "khóa đào tạo"),
            ("performance feedback", "phản hồi hiệu suất"),
            ("payroll adjustment", "điều chỉnh lương"),
            ("staff retention", "giữ chân nhân sự"),
            ("internal mobility", "luân chuyển nội bộ"),
            ("workplace policy", "chính sách nơi làm việc"),
            ("employee engagement", "mức độ gắn kết nhân viên"),
        ],
    },
    {
        "title": "TOEIC Finance & Procurement B2",
        "description": "Từ tài chính doanh nghiệp và quy trình mua sắm nội bộ.",
        "level": "B2",
        "topic": "TOEIC",
        "tags": "toeic,finance,procurement,b2",
        "estimated_minutes": 25,
        "terms": [
            ("purchase requisition", "đề nghị mua hàng"),
            ("vendor quotation", "báo giá nhà cung cấp"),
            ("invoice approval", "phê duyệt hóa đơn"),
            ("expense forecast", "dự báo chi phí"),
            ("budget control", "kiểm soát ngân sách"),
            ("account reconciliation", "đối soát tài khoản"),
            ("payment schedule", "lịch thanh toán"),
            ("contract value", "giá trị hợp đồng"),
            ("procurement process", "quy trình mua sắm"),
            ("cost optimization", "tối ưu chi phí"),
            ("audit trail", "dấu vết kiểm toán"),
            ("financial statement", "báo cáo tài chính"),
        ],
    },
    {
        "title": "TOEIC Customer Service & Logistics B2",
        "description": "Từ vựng cho chăm sóc khách hàng và điều phối giao vận.",
        "level": "B2",
        "topic": "TOEIC",
        "tags": "toeic,customer,logistics,b2",
        "estimated_minutes": 24,
        "terms": [
            ("service ticket", "phiếu hỗ trợ"),
            ("complaint handling", "xử lý khiếu nại"),
            ("dispatch schedule", "lịch điều phối giao hàng"),
            ("shipment status", "trạng thái lô hàng"),
            ("warehouse inventory", "tồn kho nhà kho"),
            ("return request", "yêu cầu trả hàng"),
            ("replacement order", "đơn đổi hàng"),
            ("service recovery", "khắc phục dịch vụ"),
            ("support escalation", "chuyển cấp hỗ trợ"),
            ("delivery accuracy", "độ chính xác giao hàng"),
            ("order fulfillment", "hoàn tất đơn hàng"),
            ("customer satisfaction", "mức độ hài lòng khách hàng"),
        ],
    },
    {
        "title": "TOEIC IT Support & Cybersecurity B2",
        "description": "Thuật ngữ CNTT, bảo mật, hỗ trợ kỹ thuật cho môi trường doanh nghiệp.",
        "level": "B2",
        "topic": "TOEIC",
        "tags": "toeic,it,cybersecurity,b2",
        "estimated_minutes": 25,
        "terms": [
            ("system outage", "sự cố hệ thống"),
            ("password reset", "đặt lại mật khẩu"),
            ("access credential", "thông tin xác thực truy cập"),
            ("security patch", "bản vá bảo mật"),
            ("backup procedure", "quy trình sao lưu"),
            ("incident report", "báo cáo sự cố"),
            ("firewall setting", "thiết lập tường lửa"),
            ("phishing alert", "cảnh báo lừa đảo"),
            ("network latency", "độ trễ mạng"),
            ("software deployment", "triển khai phần mềm"),
            ("helpdesk queue", "hàng chờ hỗ trợ"),
            ("user permission", "quyền người dùng"),
        ],
    },
    {
        "title": "TOEIC Hospitality & Travel Service B1",
        "description": "Bộ từ cho ngành khách sạn, du lịch, dịch vụ khách hàng.",
        "level": "B1",
        "topic": "TOEIC",
        "tags": "toeic,hospitality,travel,b1",
        "estimated_minutes": 21,
        "terms": [
            ("front desk", "quầy lễ tân"),
            ("room availability", "tình trạng phòng trống"),
            ("booking reference", "mã đặt chỗ"),
            ("guest request", "yêu cầu của khách"),
            ("check-out policy", "chính sách trả phòng"),
            ("concierge desk", "quầy hỗ trợ concierge"),
            ("complimentary service", "dịch vụ miễn phí"),
            ("occupancy rate", "tỷ lệ lấp đầy phòng"),
            ("reservation update", "cập nhật đặt phòng"),
            ("cancellation fee", "phí hủy"),
            ("housekeeping schedule", "lịch dọn phòng"),
            ("customer welcome", "đón tiếp khách hàng"),
        ],
    },
    {
        "title": "TOEIC Manufacturing & Quality Control B2",
        "description": "Từ chuyên ngành sản xuất, kiểm soát chất lượng, vận hành nhà máy.",
        "level": "B2",
        "topic": "TOEIC",
        "tags": "toeic,manufacturing,quality,b2",
        "estimated_minutes": 25,
        "terms": [
            ("production line", "dây chuyền sản xuất"),
            ("quality checkpoint", "điểm kiểm tra chất lượng"),
            ("defect ratio", "tỷ lệ lỗi"),
            ("safety compliance", "tuân thủ an toàn"),
            ("machine downtime", "thời gian máy ngừng"),
            ("maintenance cycle", "chu kỳ bảo trì"),
            ("raw material stock", "tồn kho nguyên liệu"),
            ("assembly process", "quy trình lắp ráp"),
            ("quality audit", "đánh giá chất lượng"),
            ("process improvement", "cải tiến quy trình"),
            ("output capacity", "công suất đầu ra"),
            ("operational efficiency", "hiệu quả vận hành"),
        ],
    },
    {
        "title": "TOEIC Contract & Negotiation B2",
        "description": "Từ vựng đàm phán, hợp đồng, điều khoản thương mại.",
        "level": "B2",
        "topic": "TOEIC",
        "tags": "toeic,contract,negotiation,b2",
        "estimated_minutes": 24,
        "terms": [
            ("contract clause", "điều khoản hợp đồng"),
            ("renewal term", "điều khoản gia hạn"),
            ("service agreement", "thỏa thuận dịch vụ"),
            ("non-disclosure clause", "điều khoản bảo mật"),
            ("pricing proposal", "đề xuất giá"),
            ("payment condition", "điều kiện thanh toán"),
            ("legal review", "thẩm định pháp lý"),
            ("negotiation strategy", "chiến lược đàm phán"),
            ("mutual benefit", "lợi ích đôi bên"),
            ("penalty clause", "điều khoản phạt"),
            ("contract amendment", "phụ lục sửa đổi hợp đồng"),
            ("final settlement", "thanh toán cuối cùng"),
        ],
    },
    {
        "title": "Daily Life - Family & Communication A2",
        "description": "Từ vựng gắn với gia đình, giao tiếp và sinh hoạt hàng ngày.",
        "level": "A2",
        "topic": "Life",
        "tags": "life,family,communication,a2",
        "estimated_minutes": 18,
        "terms": [
            ("household routine", "sinh hoạt gia đình"),
            ("sibling support", "sự hỗ trợ anh chị em"),
            ("family discussion", "thảo luận trong gia đình"),
            ("weekend outing", "đi chơi cuối tuần"),
            ("shared chores", "chia sẻ việc nhà"),
            ("respectful language", "ngôn ngữ tôn trọng"),
            ("emotional awareness", "nhận biết cảm xúc"),
            ("parenting style", "phong cách nuôi dạy con"),
            ("family budget plan", "kế hoạch tài chính gia đình"),
            ("household responsibility", "trách nhiệm trong nhà"),
            ("conflict mediation", "hòa giải mâu thuẫn"),
            ("quality time", "thời gian chất lượng"),
        ],
    },
    {
        "title": "Daily Life - Home & Utilities A2",
        "description": "Từ dùng khi thuê nhà, quản lý điện nước, internet, sửa chữa.",
        "level": "A2",
        "topic": "Life",
        "tags": "life,home,utilities,a2",
        "estimated_minutes": 18,
        "terms": [
            ("electricity bill", "hóa đơn điện"),
            ("water meter", "đồng hồ nước"),
            ("internet router", "bộ phát wifi"),
            ("maintenance request", "yêu cầu bảo trì"),
            ("rental agreement", "hợp đồng thuê nhà"),
            ("security deposit", "tiền đặt cọc"),
            ("move-in checklist", "danh sách khi dọn vào"),
            ("appliance warranty", "bảo hành thiết bị"),
            ("noise complaint", "khiếu nại tiếng ồn"),
            ("parking permit", "giấy phép đỗ xe"),
            ("trash collection", "thu gom rác"),
            ("utility payment", "thanh toán tiện ích"),
        ],
    },
    {
        "title": "Daily Life - Travel & Transportation A2",
        "description": "Từ vựng về di chuyển hàng ngày và đi lại đường dài.",
        "level": "A2",
        "topic": "Life",
        "tags": "life,travel,transport,a2",
        "estimated_minutes": 18,
        "terms": [
            ("boarding queue", "hàng đợi lên tàu/xe"),
            ("route map", "bản đồ tuyến đường"),
            ("train platform", "sân ga"),
            ("traffic update", "cập nhật giao thông"),
            ("ride booking", "đặt xe"),
            ("fare estimate", "ước tính chi phí chuyến đi"),
            ("station transfer", "chuyển tuyến tại ga"),
            ("travel itinerary", "lịch trình di chuyển"),
            ("passport check", "kiểm tra hộ chiếu"),
            ("baggage allowance", "hạn mức hành lý"),
            ("departure gate", "cổng khởi hành"),
            ("local commute", "di chuyển nội đô"),
        ],
    },
    {
        "title": "Daily Life - Shopping & Consumer B1",
        "description": "Từ vựng mua sắm online/offline và chăm sóc quyền lợi khách hàng.",
        "level": "B1",
        "topic": "Life",
        "tags": "life,shopping,consumer,b1",
        "estimated_minutes": 20,
        "terms": [
            ("shopping cart", "giỏ hàng"),
            ("price comparison", "so sánh giá"),
            ("discount voucher", "mã giảm giá"),
            ("return condition", "điều kiện trả hàng"),
            ("online checkout", "thanh toán trực tuyến"),
            ("delivery tracking", "theo dõi giao hàng"),
            ("customer review", "đánh giá khách hàng"),
            ("secure payment", "thanh toán an toàn"),
            ("product warranty", "bảo hành sản phẩm"),
            ("exchange request", "yêu cầu đổi hàng"),
            ("order confirmation", "xác nhận đơn hàng"),
            ("store credit", "điểm/tín dụng cửa hàng"),
        ],
    },
    {
        "title": "Daily Life - Health & Emergency B1",
        "description": "Từ vựng đi khám, chăm sóc sức khỏe và xử lý tình huống khẩn.",
        "level": "B1",
        "topic": "Life",
        "tags": "life,health,emergency,b1",
        "estimated_minutes": 22,
        "terms": [
            ("medical checkup", "khám sức khỏe"),
            ("prescription refill", "mua thuốc theo toa"),
            ("emergency contact", "liên hệ khẩn cấp"),
            ("first aid kit", "bộ sơ cứu"),
            ("blood pressure", "huyết áp"),
            ("allergy symptom", "triệu chứng dị ứng"),
            ("vaccination schedule", "lịch tiêm chủng"),
            ("clinic appointment", "lịch hẹn phòng khám"),
            ("recovery period", "giai đoạn hồi phục"),
            ("health insurance", "bảo hiểm y tế"),
            ("urgent care", "chăm sóc khẩn cấp"),
            ("hydration reminder", "nhắc bổ sung nước"),
        ],
    },
    {
        "title": "Daily Life - Food & Lifestyle A2",
        "description": "Từ vựng nhà bếp, dinh dưỡng, thói quen ăn uống lành mạnh.",
        "level": "A2",
        "topic": "Life",
        "tags": "life,food,lifestyle,a2",
        "estimated_minutes": 19,
        "terms": [
            ("meal planning", "lên kế hoạch bữa ăn"),
            ("grocery budget", "ngân sách mua thực phẩm"),
            ("balanced plate", "khẩu phần cân bằng"),
            ("cooking method", "phương pháp nấu"),
            ("ingredient list", "danh sách nguyên liệu"),
            ("food hygiene", "vệ sinh thực phẩm"),
            ("expiration label", "nhãn hạn sử dụng"),
            ("healthy snack", "bữa phụ lành mạnh"),
            ("portion control", "kiểm soát khẩu phần"),
            ("dietary habit", "thói quen ăn uống"),
            ("kitchen cleanup", "dọn bếp"),
            ("drinking water", "nước uống"),
        ],
    },
    {
        "title": "Daily Life - Banking & Personal Finance B1",
        "description": "Bộ từ thực tế về tài chính cá nhân, ngân hàng, tiết kiệm.",
        "level": "B1",
        "topic": "Life",
        "tags": "life,banking,finance,b1",
        "estimated_minutes": 22,
        "terms": [
            ("savings goal", "mục tiêu tiết kiệm"),
            ("monthly income", "thu nhập hàng tháng"),
            ("expense tracking", "theo dõi chi tiêu"),
            ("emergency fund", "quỹ khẩn cấp"),
            ("credit limit", "hạn mức tín dụng"),
            ("loan repayment", "trả nợ khoản vay"),
            ("interest charge", "phí lãi suất"),
            ("bank transfer", "chuyển khoản ngân hàng"),
            ("account statement", "sao kê tài khoản"),
            ("fraud warning", "cảnh báo gian lận"),
            ("budgeting habit", "thói quen lập ngân sách"),
            ("financial decision", "quyết định tài chính"),
        ],
    },
    {
        "title": "Daily Life - Digital & Social Media B1",
        "description": "Từ vựng về mạng xã hội, quyền riêng tư và an toàn số.",
        "level": "B1",
        "topic": "Life",
        "tags": "life,digital,social-media,b1",
        "estimated_minutes": 21,
        "terms": [
            ("privacy setting", "cài đặt quyền riêng tư"),
            ("two-factor login", "đăng nhập 2 lớp"),
            ("comment moderation", "kiểm duyệt bình luận"),
            ("online profile", "hồ sơ trực tuyến"),
            ("spam filter", "bộ lọc thư rác"),
            ("digital footprint", "dấu vết số"),
            ("content sharing", "chia sẻ nội dung"),
            ("screen-time alert", "cảnh báo thời gian màn hình"),
            ("direct message", "tin nhắn riêng"),
            ("account verification", "xác minh tài khoản"),
            ("online etiquette", "phép lịch sự trực tuyến"),
            ("cyber awareness", "nhận thức an ninh mạng"),
        ],
    },
    {
        "title": "Daily Life - Fitness & Sports B1",
        "description": "Từ khóa luyện tập thể thao, sức bền, phục hồi cơ thể.",
        "level": "B1",
        "topic": "Life",
        "tags": "life,fitness,sports,b1",
        "estimated_minutes": 21,
        "terms": [
            ("workout session", "buổi tập"),
            ("stretching routine", "bài giãn cơ"),
            ("heart-rate zone", "vùng nhịp tim"),
            ("recovery day", "ngày phục hồi"),
            ("training intensity", "cường độ luyện tập"),
            ("fitness tracker", "thiết bị theo dõi vận động"),
            ("body posture", "tư thế cơ thể"),
            ("endurance level", "mức độ bền"),
            ("muscle soreness", "đau mỏi cơ"),
            ("warm-up drill", "bài khởi động"),
            ("hydration break", "nghỉ uống nước"),
            ("personal best", "thành tích cá nhân tốt nhất"),
        ],
    },
    {
        "title": "Daily Life - Work from Home B1",
        "description": "Bộ từ vựng cho bối cảnh làm việc từ xa và cộng tác online.",
        "level": "B1",
        "topic": "Life",
        "tags": "life,work-from-home,productivity,b1",
        "estimated_minutes": 21,
        "terms": [
            ("virtual meeting", "cuộc họp trực tuyến"),
            ("home workspace", "góc làm việc tại nhà"),
            ("task prioritization", "ưu tiên công việc"),
            ("focus block", "khung giờ tập trung"),
            ("remote collaboration", "hợp tác từ xa"),
            ("work-life balance", "cân bằng công việc-cuộc sống"),
            ("internet stability", "độ ổn định internet"),
            ("shared calendar", "lịch dùng chung"),
            ("productivity tool", "công cụ năng suất"),
            ("deadline tracking", "theo dõi deadline"),
            ("asynchronous update", "cập nhật không đồng bộ"),
            ("digital workspace", "không gian làm việc số"),
        ],
    },
    {
        "title": "Daily Life - Community & Events A2",
        "description": "Từ vựng sự kiện cộng đồng, giao tiếp xã hội và hoạt động địa phương.",
        "level": "A2",
        "topic": "Life",
        "tags": "life,community,events,a2",
        "estimated_minutes": 18,
        "terms": [
            ("neighborhood meeting", "họp khu dân cư"),
            ("volunteer activity", "hoạt động tình nguyện"),
            ("community center", "trung tâm cộng đồng"),
            ("event organizer", "ban tổ chức sự kiện"),
            ("guest invitation", "lời mời khách"),
            ("cultural festival", "lễ hội văn hóa"),
            ("charity campaign", "chiến dịch từ thiện"),
            ("local announcement", "thông báo địa phương"),
            ("public celebration", "lễ kỷ niệm công cộng"),
            ("event schedule", "lịch sự kiện"),
            ("participation fee", "phí tham gia"),
            ("social gathering", "buổi tụ họp"),
        ],
    },
    {
        "title": "Daily Life - Green Living B1",
        "description": "Nội dung về lối sống xanh, giảm rác thải, tiết kiệm năng lượng.",
        "level": "B1",
        "topic": "Life",
        "tags": "life,green-living,sustainability,b1",
        "estimated_minutes": 21,
        "terms": [
            ("reusable bottle", "bình nước tái sử dụng"),
            ("energy-saving habit", "thói quen tiết kiệm điện"),
            ("recycling program", "chương trình tái chế"),
            ("compost practice", "ủ phân hữu cơ"),
            ("water conservation", "tiết kiệm nước"),
            ("eco product", "sản phẩm thân thiện môi trường"),
            ("waste sorting", "phân loại rác"),
            ("low-carbon travel", "di chuyển ít phát thải"),
            ("sustainable purchase", "mua sắm bền vững"),
            ("home insulation", "cách nhiệt nhà ở"),
            ("air purifier", "máy lọc không khí"),
            ("environmental awareness", "nhận thức môi trường"),
        ],
    },
]


def _build_cards(topic: str, terms: list[tuple[str, str]]) -> list[tuple[str, str, str, str]]:
    cards: list[tuple[str, str, str, str]] = []
    for front, back in terms:
        example = f"{front.capitalize()} is a useful expression in {topic.lower()} contexts."
        cards.append((front, back, example, ""))
    return cards


def _expanded_decks() -> list[dict]:
    decks = []
    for blueprint in EXPANDED_DECK_BLUEPRINTS:
        deck = dict(blueprint)
        deck["cards"] = _build_cards(blueprint["topic"], blueprint["terms"])
        deck.pop("terms", None)
        decks.append(deck)
    return decks


def ensure_extra_library_decks(db) -> int:
    existing_titles = {title for (title,) in db.query(LibraryDeck.title).all()}
    existing_fronts = {front.strip().lower() for (front,) in db.query(LibraryCard.front_text).all() if front}

    added = 0
    catalog = BASE_LIBRARY_DECKS + _expanded_decks()

    for deck_data in catalog:
        if deck_data["title"] in existing_titles:
            continue

        cards = deck_data["cards"]
        unique_cards: list[tuple[str, str, str, str]] = []

        for front, back, example, phonetic in cards:
            key = front.strip().lower()
            if not key or key in existing_fronts:
                continue
            existing_fronts.add(key)
            unique_cards.append((front, back, example, phonetic))

        if len(unique_cards) < 8:
            # Skip deck nếu sau lọc trùng mà còn quá ít card
            continue

        deck = LibraryDeck(
            title=deck_data["title"],
            description=deck_data["description"],
            level=deck_data["level"],
            topic=deck_data["topic"],
            tags=deck_data["tags"],
            estimated_minutes=deck_data["estimated_minutes"],
            is_public=True,
        )
        db.add(deck)
        db.flush()

        for index, (front, back, example, phonetic) in enumerate(unique_cards):
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

        existing_titles.add(deck_data["title"])
        added += 1

    return added


def create_user(db, idx: int) -> User:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    email = f"sample.user.{idx:04d}@example.com"

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing

    user = User(
        email=email,
        full_name=f"{first} {last}",
        password_hash=get_password_hash("123456"),
    )
    db.add(user)
    db.flush()
    return user


def ensure_user_decks(db, user: User, decks_per_user: int) -> list[UserDeck]:
    current = db.query(UserDeck).filter(UserDeck.user_id == user.id).all()
    if len(current) >= decks_per_user:
        return current

    library_decks = db.query(LibraryDeck).filter(LibraryDeck.is_public.is_(True)).all()
    random.shuffle(library_decks)

    have_source_ids = {d.source_library_deck_id for d in current if d.source_library_deck_id is not None}

    for lib in library_decks:
        if len(current) >= decks_per_user:
            break
        if lib.id in have_source_ids:
            continue

        created_at = datetime.now() - timedelta(days=random.randint(0, 90))
        user_deck = UserDeck(
            user_id=user.id,
            source_library_deck_id=lib.id,
            title=lib.title,
            description=lib.description,
            level=lib.level,
            topic=lib.topic,
            created_at=created_at,
        )
        db.add(user_deck)
        db.flush()

        cards = db.query(LibraryCard).filter(LibraryCard.deck_id == lib.id).order_by(LibraryCard.position.asc()).all()

        for card in cards:
            interval = random.choice([0, 1, 2, 3, 4, 7, 10, 14, 21])
            repetitions = random.randint(0, 8)
            ease = round(random.uniform(1.4, 2.8), 2)
            last_reviewed = datetime.now() - timedelta(days=random.randint(0, 45))
            due_at = datetime.now() + timedelta(days=random.randint(-10, 12))

            db.add(
                UserCard(
                    user_deck_id=user_deck.id,
                    source_library_card_id=card.id,
                    front_text=card.front_text,
                    back_text=card.back_text,
                    example_sentence=card.example_sentence,
                    phonetic=card.phonetic,
                    due_at=due_at,
                    interval_days=interval,
                    repetitions=repetitions,
                    ease_factor=ease,
                    lapses=random.randint(0, 4),
                    last_reviewed_at=last_reviewed,
                    created_at=created_at,
                )
            )

        current.append(user_deck)
        have_source_ids.add(lib.id)

    return current


def generate_review_logs(db, user: User, days: int):
    cards = (
        db.query(UserCard)
        .join(UserDeck, UserDeck.id == UserCard.user_deck_id)
        .filter(UserDeck.user_id == user.id)
        .all()
    )
    if not cards:
        return

    existing_count = db.query(ReviewLog).filter(ReviewLog.user_id == user.id).count()
    if existing_count > 320:
        return

    total_reviews = random.randint(120, 340)
    now = datetime.now()

    for _ in range(total_reviews):
        card = random.choice(cards)
        reviewed_at = now - timedelta(days=random.randint(0, days), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        rating = random.choices(
            ["again", "hard", "good", "easy"],
            weights=[14, 22, 43, 21],
            k=1,
        )[0]
        was_correct = rating in {"hard", "good", "easy"}
        next_due = reviewed_at + timedelta(days=random.choice([0, 1, 2, 3, 5, 7, 10, 14]))

        db.add(
            ReviewLog(
                user_id=user.id,
                user_card_id=card.id,
                rating=rating,
                was_correct=was_correct,
                reviewed_at=reviewed_at,
                next_due_at=next_due,
            )
        )


def generate_exercises(db, user: User, user_decks: list[UserDeck], days: int):
    existing_count = db.query(ExerciseAttempt).filter(ExerciseAttempt.user_id == user.id).count()
    if existing_count > 70:
        return

    now = datetime.now()

    for deck in user_decks:
        cards = db.query(UserCard).filter(UserCard.user_deck_id == deck.id).all()
        if len(cards) < 4:
            continue

        attempts = random.randint(4, 14)
        for _ in range(attempts):
            total_questions = random.randint(4, 10)
            selected = random.sample(cards, k=min(total_questions, len(cards)))

            answer_payloads = []
            correct = 0
            for i, card in enumerate(selected):
                qtype = "multiple_choice" if i % 2 == 0 else "hard_fill"
                if qtype == "multiple_choice":
                    question_text = card.front_text
                    prompt = "Chọn nghĩa tiếng Việt đúng (4 đáp án)"
                    true_answer = card.back_text
                    if random.random() < 0.72:
                        user_answer = true_answer
                        is_correct = True
                    else:
                        wrong_candidates = [c.back_text for c in cards if c.id != card.id]
                        user_answer = random.choice(wrong_candidates) if wrong_candidates else ""
                        is_correct = False
                else:
                    question_text = card.back_text
                    prompt = "Điền từ tiếng Anh khó tương ứng"
                    true_answer = card.front_text
                    if random.random() < 0.6:
                        user_answer = true_answer
                        is_correct = True
                    else:
                        user_answer = true_answer[:-1] if len(true_answer) > 2 else "x"
                        is_correct = False

                if is_correct:
                    correct += 1

                answer_payloads.append((card.id, qtype, question_text, prompt, true_answer, user_answer, is_correct))

            score = round((correct / len(answer_payloads)) * 100, 2)
            created_at = now - timedelta(days=random.randint(0, days), hours=random.randint(0, 23), minutes=random.randint(0, 59))

            attempt = ExerciseAttempt(
                user_id=user.id,
                user_deck_id=deck.id,
                total_questions=len(answer_payloads),
                correct_answers=correct,
                score_percent=score,
                created_at=created_at,
            )
            db.add(attempt)
            db.flush()

            for payload in answer_payloads:
                db.add(
                    ExerciseAnswer(
                        attempt_id=attempt.id,
                        user_card_id=payload[0],
                        question_type=payload[1],
                        question_text=payload[2],
                        prompt_text=payload[3],
                        correct_answer=payload[4],
                        user_answer=payload[5],
                        is_correct=payload[6],
                    )
                )


def clear_sample_users(db):
    sample_users = db.query(User).filter(User.email.like("sample.user.%@example.com")).all()
    for u in sample_users:
        db.delete(u)


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--users", type=int, default=600, help="Number of sample users to generate")
    parser.add_argument("--decks-per-user", type=int, default=6, help="Installed decks per user")
    parser.add_argument("--days", type=int, default=180, help="Backfill activity in N recent days")
    parser.add_argument("--reset-sample-users", action="store_true", help="Delete old sample users before generating")
    return parser.parse_args()


def main():
    args = parse_args()
    random.seed(42)

    db = SessionLocal()
    try:
        added_decks = ensure_extra_library_decks(db)
        db.commit()

        if args.reset_sample_users:
            clear_sample_users(db)
            db.commit()

        for i in range(1, args.users + 1):
            user = create_user(db, i)
            user_decks = ensure_user_decks(db, user, args.decks_per_user)
            generate_review_logs(db, user, args.days)
            generate_exercises(db, user, user_decks, args.days)

            if i % 10 == 0:
                db.commit()

        db.commit()

        lib_decks = db.query(LibraryDeck).count()
        lib_cards = db.query(LibraryCard).count()
        users = db.query(User).count()
        user_decks_count = db.query(UserDeck).count()
        user_cards_count = db.query(UserCard).count()
        reviews = db.query(ReviewLog).count()
        attempts = db.query(ExerciseAttempt).count()
        answers = db.query(ExerciseAnswer).count()

        print("✅ Sample data generation completed")
        print(f"added_library_decks={added_decks}")
        print(f"library_decks={lib_decks}")
        print(f"library_cards={lib_cards}")
        print(f"users={users}")
        print(f"user_decks={user_decks_count}")
        print(f"user_cards={user_cards_count}")
        print(f"review_logs={reviews}")
        print(f"exercise_attempts={attempts}")
        print(f"exercise_answers={answers}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
