INSERT IGNORE INTO templates (id, name, category, ratio, image, accent, description) VALUES
('t01','午后果园','产品海报','3:4','https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=960&q=85','#d9e8c5','清新自然的果蔬产品视觉，适合上新与日常推广。'),
('t02','城市漫游','社交媒体','4:5','https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=960&q=85','#dce5ee','为城市旅行与生活方式内容打造的轻松版式。'),
('t03','春日花集','活动邀请','3:4','https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=960&q=85','#f1dce0','柔和花卉与留白排版，适合活动邀约与节日内容。'),
('t04','咖啡时刻','产品海报','1:1','https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=960&q=85','#e7dbce','温暖质感的咖啡主题模板，突出产品与品牌调性。'),
('t05','海岸假日','社交媒体','4:5','https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=960&q=85','#cfe8e7','明亮通透的海岸旅行主题，适合夏日社交内容。'),
('t06','静物研究','品牌视觉','3:4','https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=960&q=85','#d8d6cd','克制的构图与自然光线，呈现品牌产品细节。'),
('t07','周末市集','活动邀请','1:1','https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=960&q=85','#e8e2ca','轻快活泼的市集活动视觉，方便快速制作宣传图。'),
('t08','香氛日记','品牌视觉','3:4','https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=960&q=85','#e9d9d1','细腻柔和的香氛品牌画面，适合新品与产品故事。'),
('demo-postcard','旅行明信片','创意图片','3:2','https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=960&q=85','#dce7e8','上传两张旅行照片，模拟生成一张旅行明信片。');

INSERT INTO template_requirements (template_id, required_image_count, accepted_mime_types, max_file_size_bytes) VALUES
('t01',1,'image/jpeg,image/png',12582912),
('t02',1,'image/jpeg,image/png',12582912),
('t03',1,'image/jpeg,image/png',12582912),
('t04',1,'image/jpeg,image/png',12582912),
('t05',1,'image/jpeg,image/png',12582912),
('t06',1,'image/jpeg,image/png',12582912),
('t07',1,'image/jpeg,image/png',12582912),
('t08',1,'image/jpeg,image/png',12582912),
('demo-postcard',2,'image/jpeg,image/png',5242880)
ON DUPLICATE KEY UPDATE
  required_image_count = VALUES(required_image_count),
  accepted_mime_types = VALUES(accepted_mime_types),
  max_file_size_bytes = VALUES(max_file_size_bytes);
