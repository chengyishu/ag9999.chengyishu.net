window.onload = function() {
  // 加载数据
  localStorage.removeItem('id');
  let id = parseInt(getQueryParam('id'));
  if (Number.isInteger(id)) {
    loadData(id);
  } else {
    axios.get(`./json/info.json`).then(function(response) {
      // 默认最新
      loadData(response.data['latest'], true);
    }).catch(function(error) {
      console.log(error);
    }).finally(function() {});
  }
}

// 解析查询
function getQueryParam(param) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(param);
}

// 加载数据
function loadData(id, showPriceLine = false) {
  // 定义主图技术指标
  klinecharts.registerIndicator({
    name: 'MA',
    shortName: '',
    precision: 0,
    figures: [{
      key: 'ma',
      type: 'line',
      styles: () => ({
        color: 'orange'
      })
    }],
    // 计算结果
    calc: (kLineDataList) => {
      let closeSums = 0;
      return kLineDataList.map((kLineData, i) => {
        const data = {};
        closeSums = (closeSums || 0) + kLineData.close;
        if (i >= 20 - 1) {
          data['ma'] = closeSums / 20;
          closeSums -= kLineDataList[i - (20 - 1)].close;
        }
        return data;
      });
    }
  });

  // 定义副图技术指标
  klinecharts.registerIndicator({
    name: 'MACD',
    shortName: '',
    precision: 0,
    figures: [{
      key: 'zero',
      type: 'line',
      styles: () => ({
        color: 'red',
        size: 1
      }),
    }, {
      key: 'effort',
      title: '力度: ',
      type: 'line',
      styles: () => ({
        color: 'yellow',
        size: 1
      }),
    }, {
      key: 'effortdiff',
      title: '差: ',
      type: 'line',
      styles: () => ({
        color: 'white',
        size: 1
      }),
    }],
    // 计算结果
    calc: (kLineDataList) => {
      return kLineDataList.map((kLineData, i) => {
        const data = {};
        data['zero'] = 0;
        data['effort'] = kLineData.effort;
        data['effortdiff'] = kLineData.effortdiff;
        return data;
      });
    }
  });

  // 初始化图表
  const chart = klinecharts.init('chart');
  chart.setLocale('zh-CN');
  chart.setPrecision({
    price: 0,
    volume: 0
  });
  chart.setBarSpace(15);
  chart.setStyles({
    grid: {
      show: false,
      horizontal: {
        color: '#414141',
        dashedValue: [5, 5]
      },
      vertical: {
        color: '#414141',
        dashedValue: [5, 5]
      }
    },
    candle: {
      type: 'candle_up_stroke',
      bar: {
        upColor: '#F92855',
        upBorderColor: '#F92855',
        upWickColor: '#F92855',
        downColor: '#2DC08E',
        downBorderColor: '#2DC08E',
        downWickColor: '#2DC08E',
        noChangeColor: '#CCCCCC',
        noChangeBorderColor: '#CCCCCC',
        noChangeWickColor: '#CCCCCC'
      },
      priceMark: {
        last: {
          show: showPriceLine,
          upColor: '#F92855',
          downColor: '#2DC08E',
          noChangeColor: '#CCCCCC',
        },
      },
      tooltip: {
        custom: [{
            title: 'time',
            value: '{time}'
          },
          {
            title: 'open',
            value: '{open}'
          },
          {
            title: 'high',
            value: '{high}'
          },
          {
            title: 'low',
            value: '{low}'
          },
          {
            title: 'close',
            value: '{close}'
          },
        ]
      }
    },
    xAxis: {
      axisLine: {
        color: '#414141',
      },
    },
    yAxis: {
      axisLine: {
        color: '#414141',
      },
    },
    separator: {
      color: '#414141',
    }
  });

  // 主图技术指标
  chart.createIndicator('MA', true, {
    id: 'candle_pane',
  });
  // 副图技术指标
  chart.createIndicator('MACD', true, {
    height: 300,
  });

  axios.get(`./json/data-${id}.json`).then(function(response) {
    const kLineDataList = response.data;
    const chartDataList = kLineDataList.map(function(data) {
      return {
        timestamp: new Date(`${data[0]} 15:00`).getTime(),
        open: +data[1],
        high: +data[2],
        low: +data[3],
        close: +data[4],
        pen: +data[5],
        segment: +data[6],
        effort: +data[7],
        effortdiff: +data[8],
      }
    });
    chart.applyNewData(chartDataList);
    let penPoints = []; // 笔
    let segmentPoints = []; // 段
    for (const chartData of chartDataList) {
      // 画笔
      if (chartData.pen > 0) {
        penPoints.push({
          timestamp: chartData.timestamp,
          value: chartData.pen,
        });
      }
      if (penPoints.length === 2) {
        chart.createOverlay({
          name: 'segment',
          groupId: 'pens',
          points: penPoints,
        });
        penPoints.shift();
      }
      // 画段
      if (chartData.segment > 0) {
        segmentPoints.push({
          timestamp: chartData.timestamp,
          value: chartData.segment,
        });
      }
      if (segmentPoints.length === 2) {
        chart.createOverlay({
          name: 'segment',
          groupId: 'segments',
          points: segmentPoints,
        });
        segmentPoints.shift();
      }
    }
    // 笔样式
    chart.overrideOverlay({
      groupId: 'pens',
      lock: true,
      styles: {
        line: {
          color: 'red',
        },
        point: {
          color: 'red',
          borderColor: 'rgba(255, 0, 0, 0.65)',
          borderSize: 2,
          radius: 3,
          activeColor: 'red',
          activeBorderColor: 'rgba(255, 0, 0, 0.65)',
          activeBorderSize: 2,
          activeRadius: 5,
        },
      }
    });
    // 段样式
    chart.overrideOverlay({
      groupId: 'segments',
      lock: true,
      styles: {
        line: {
          color: 'yellow',
          size: 2,
        },
        point: {
          color: 'yellow',
          borderColor: 'rgba(255, 255, 0, 0.65)',
          borderSize: 2,
          radius: 3,
          activeColor: 'yellow',
          activeBorderColor: 'rgba(255, 255, 0, 0.65)',
          activeBorderSize: 2,
          activeRadius: 5,
        },
      }
    });
  }).catch(function(error) {
    console.log(error);
  }).finally(function() {
    let id = parseInt(getQueryParam('id'));
    if (Number.isInteger(id)) {
      if (localStorage.getItem('id')) {
        id = parseInt(localStorage.getItem('id'));
      }
      let clickTimeout;
      function handleSingleClick(event) {
        id += 1;
        localStorage.setItem('id', id);
        document.getElementById('chart').style['opacity'] = '0';
        setTimeout(() => {
          document.getElementById('chart').innerHTML = '';
          loadData(id);
          document.getElementById('chart').style['opacity'] = '1';
        }, 300);
      }
      function handleDoubleClick(event) {
        id -= 1;
        localStorage.setItem('id', id);
        document.getElementById('chart').style['opacity'] = '0';
        setTimeout(() => {
          document.getElementById('chart').innerHTML = '';
          loadData(id);
          document.getElementById('chart').style['opacity'] = '1';
        }, 300);
        clearTimeout(clickTimeout); // 清除单击计时器
      }
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        let clickedOnce = false;
        ['click', 'touchend'].forEach(function(item) {
          canvas.addEventListener(item, function(event) {
            if (clickedOnce) {
              handleDoubleClick(event);
              clickedOnce = false;
            } else {
              clickedOnce = true;
              clickTimeout = setTimeout(() => {
                if (clickedOnce) {
                  handleSingleClick(event);
                  clickedOnce = false;
                }
              }, 300); // 单击和双击之间的间隔时间（毫秒）
            }
          });
        })
        canvas.addEventListener('dblclick', function(event) {
          event.preventDefault(); // 防止默认双击行为
        });
      });
    }
  });
}