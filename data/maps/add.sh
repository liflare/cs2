#!/bin/bash

# Функция меню карт
show_menu() {
    clear
    echo "=== ПОЛНАЯ АВТОМАТИЗАЦИЯ РАСКИДОВ (ЗАЩИЩЕННЫЙ АЛГОРИТМ) ==="
    echo "1-е фото: 'temp.png'   | 2-е фото: 'temp2.png'"
    echo "3-е фото: 'temp3.png'  | 4-е фото: 'temp4.png'"
    echo "--------------------------------------------------------"
    echo "Выберите карту (введите число от 1 до 10):"
    echo "1) Mirage   2) Inferno   3) Dust 2   4) Nuke"
    echo "5) Overpass 6) Vertigo   7) Ancient  8) Anubis"
    echo "9) Train    10) Cache"
    echo "--------------------------------------------------------"
}

while true; do
    show_menu
    read -p "Номер карты: " MAP_CHOICE
    case $MAP_CHOICE in
        1) JSON_FILE="mirage.json" ; break ;;
        2) JSON_FILE="inferno.json" ; break ;;
        3) JSON_FILE="dust2.json" ; break ;;
        4) JSON_FILE="nuke.json" ; break ;;
        5) JSON_FILE="overpass.json" ; break ;;
        6) JSON_FILE="vertigo.json" ; break ;;
        7) JSON_FILE="ancient.json" ; break ;;
        8) JSON_FILE="anubis.json" ; break ;;
        9) JSON_FILE="train.json" ; break ;;
        10) JSON_FILE="cache.json" ; break ;;
        *) echo "❌ Неверный ввод!"; sleep 1 ;;
    esac
done

if [ ! -f "$JSON_FILE" ]; then
    echo "❌ Ошибка: Файл $JSON_FILE не найден!" ; read -p "Enter..." ; exit 1
fi

echo "Выбрана карта: $JSON_FILE"
echo "--------------------------------------------------------"

TARGET_DIR="../../images/lineups"

# Сбор данных с циклом проверки ошибок и возможностью редактирования
while true; do
    read -p "ID раскида (например, l0103): " LINEUP_ID
    
    # === НАШЕ КЛЮЧЕВОЕ ОБНОВЛЕНИЕ: ЗАЩИТА ОТ СТИРАНИЯ ФОТОГРАФИЙ ===
    if [ -f "$TARGET_DIR/${LINEUP_ID}.png" ]; then
        echo ""
        echo "❌ ОШИБКА: Файл ${LINEUP_ID}.png УЖЕ СУЩЕСТВУЕТ на диске!"
        echo "⚠️ Если продолжить, старые скриншоты этой раскидки сотрутся навсегда!"
        echo "--------------------------------------------------------"
        read -p "Желаете ввести другой ID? (y - ввести заново / n - выйти из скрипта): " CRISIS_CHOICE
        if [ "$CRISIS_CHOICE" = "y" ] || [ "$CRISIS_CHOICE" = "Y" ]; then
            echo "--------------------------------------------------------"
            continue
        else
            echo "Выход из скрипта. Файлы temp.png в полной безопасности."
            read -p "Нажмите Enter..." ; exit 1
        fi
    fi

    # Сбор остальных текстовых данных
    read -p "ID позиции (английскими, например, b_apps): " POS_ID
    read -p "Название позиции на русском (например, Б Ковры): " POS_NAME
    read -p "Тип (smoke, flash, molotov, he): " L_TYPE
    read -p "Название раскида (например, Смок в хелпу): " TITLE
    read -p "Описание: " DESC
    echo "--------------------------------------------------------"
    read -p "Координата X точки (0-100, Enter = 50): " COORD_X
    read -p "Координата Y точки (0-100, Enter = 50): " COORD_Y
    [ -z "$COORD_X" ] && COORD_X=50
    [ -z "$COORD_Y" ] && COORD_Y=50

    # Проверка введенных данных перед сохранением
    clear
    echo "=== ПРОВЕРКА ВВЕДЕННЫХ ДАННЫХ ==="
    echo "Карта:       $JSON_FILE"
    echo "ID раскида:  $LINEUP_ID"
    echo "Позиция:     $POS_NAME ($POS_ID)"
    echo "Тип гранаты: $L_TYPE"
    echo "Заголовок:   $TITLE"
    echo "Описание:    $DESC"
    echo "Координаты:  X: $COORD_X, Y: $COORD_Y"
    echo "--------------------------------------------------------"
    read -p "Все введено верно? (y - сохранить в базу / n - переписать данные): " CONFIRM
    if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
        break
    else
        clear
        echo "Начинаем ввод заново..."
        echo "--------------------------------------------------------"
    fi
done

# Перенос картинки (теперь на 100% безопасный)
mkdir -p "$TARGET_DIR"

HAS_IMAGE2=false
HAS_IMAGE3=false
HAS_IMAGE4=false

[ -f "temp.png" ] && mv temp.png "$TARGET_DIR/${LINEUP_ID}.png" && echo "✔ Первое фото сохранено."
[ -f "temp2.png" ] && mv temp2.png "$TARGET_DIR/${LINEUP_ID}_2.png" && echo "✔ Второе фото сохранено." && HAS_IMAGE2=true
[ -f "temp3.png" ] && mv temp3.png "$TARGET_DIR/${LINEUP_ID}_3.png" && echo "✔ Третье фото сохранено." && HAS_IMAGE3=true
[ -f "temp4.png" ] && mv temp4.png "$TARGET_DIR/${LINEUP_ID}_4.png" && echo "✔ Четвертое фото сохранено." && HAS_IMAGE4=true

# Подготовка текстовых вставок
NEW_POS="    {\n      \"id\": \"$POS_ID\",\n      \"name\": \"$POS_NAME\"\n    }"
NEW_COORD="    \"$POS_ID\": { \"x\": $COORD_X, \"y\": $COORD_Y }"

BLOCK_CONTENT="      \"id\": \"$LINEUP_ID\",\n      \"positionId\": \"$POS_ID\",\n      \"type\": \"$L_TYPE\",\n      \"title\": \"$TITLE\",\n      \"description\": \"$DESC\",\n      \"video\": \"\",\n      \"image\": \"images/lineups/${LINEUP_ID}.png\""
[ "$HAS_IMAGE2" = true ] && BLOCK_CONTENT="$BLOCK_CONTENT,\n      \"image2\": \"images/lineups/${LINEUP_ID}_2.png\""
[ "$HAS_IMAGE3" = true ] && BLOCK_CONTENT="$BLOCK_CONTENT,\n      \"image3\": \"images/lineups/${LINEUP_ID}_3.png\""
[ "$HAS_IMAGE4" = true ] && BLOCK_CONTENT="$BLOCK_CONTENT,\n      \"image4\": \"images/lineups/${LINEUP_ID}_4.png\""
NEW_BLOCK="    {\n$BLOCK_CONTENT\n    }"

# ========================================================
# ПУЛЕНЕПРОБИВАЕМЫЙ НАДЁЖНЫЙ КЛЮЧЕВОЙ АЛГОРИТМ ЧЕРЕЗ AWK
# ========================================================

# 1. Работаем с "positions"
if ! grep -q "\"id\": \"$POS_ID\"" "$JSON_FILE"; then
    awk -v block="$NEW_POS" '
    /"positions": \[/ { print; print block ","; next }
    { print }
    ' "$JSON_FILE" > temp_json.json && mv temp_json.json "$JSON_FILE"
    sed -i 's/},\s*\]/}\n  ]/g' "$JSON_FILE"
fi

# 2. Работаем с "positionCoords"
if ! grep -q "\"$POS_ID\":" "$JSON_FILE"; then
    awk -v block="$NEW_COORD" '
    /"positionCoords": \{/ { print; print block ","; next }
    { print }
    ' "$JSON_FILE" > temp_json.json && mv temp_json.json "$JSON_FILE"
    sed -i 's/},\s*\}/}\n  \}/g' "$JSON_FILE"
fi

# 3. Работаем с "lineups"
awk -v block="$NEW_BLOCK" '
/"lineups": \[/ { print; print block ","; next }
{ print }
' "$JSON_FILE" > temp_json.json && mv temp_json.json "$JSON_FILE"
sed -i 's/},\s*\]/}\n  ]/g' "$JSON_FILE"

echo "--------------------------------------------------------"
echo "✔ Все базы данных (включая координаты!) успешно обновлены."
read -p "Нажмите Enter для выхода..."
