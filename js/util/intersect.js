// pa = new PointVec2D(x, y)
// var res = InterSection2D.intersect2D(pa0, pa1, pb0, pb1);
// if (_this.resultLabelElement != null) {
//     if (res.type == EIntersect2DResult.INTERSECTION_INSIDE_SEGMENT || res.type == EIntersect2DResult.INTERSECTION_IN_ONE_SEGMENT || res.type == EIntersect2DResult.INTERSECTION_OUTSIDE_SEGMENT) {


/**
 * Enumeration of possible results of line intersection.
 */
var EIntersect2DResult;
(function (EIntersect2DResult) {
    EIntersect2DResult[EIntersect2DResult["TRUE_PARALLEL"] = 0] = "TRUE_PARALLEL";
    EIntersect2DResult[EIntersect2DResult["COINCIDENT_PARTLY_OVERLAP"] = 1] = "COINCIDENT_PARTLY_OVERLAP";
    EIntersect2DResult[EIntersect2DResult["COINCIDENT_TOTAL_OVERLAP"] = 2] = "COINCIDENT_TOTAL_OVERLAP";
    EIntersect2DResult[EIntersect2DResult["COINCIDENT_NO_OVERLAP"] = 3] = "COINCIDENT_NO_OVERLAP";
    EIntersect2DResult[EIntersect2DResult["INTERSECTION_OUTSIDE_SEGMENT"] = 4] = "INTERSECTION_OUTSIDE_SEGMENT";
    EIntersect2DResult[EIntersect2DResult["INTERSECTION_IN_ONE_SEGMENT"] = 5] = "INTERSECTION_IN_ONE_SEGMENT";
    EIntersect2DResult[EIntersect2DResult["INTERSECTION_INSIDE_SEGMENT"] = 6] = "INTERSECTION_INSIDE_SEGMENT";
})(EIntersect2DResult || (EIntersect2DResult = {}));
/**
 * Class to hold the result of a line intersection algorithm. The intersection point is optional.
 */
export var Intersect2DResult = (function () {
    function Intersect2DResult(type, x, y) {
        this.type = type;
        this.x = x || 0;
        this.y = y || 0;
    }
    return Intersect2DResult;
})();
/**
 * Represents either a two-dimensional point of vector.
 */
export var PointVec2D = (function () {
    function PointVec2D(x, y) {
        this.x = x;
        this.y = y;
    }
    /* Calculates p0 - p1 */
    PointVec2D.minus = function (p0, p1) {
        return new PointVec2D(p0.x - p1.x, p0.y - p1.y);
    };
    return PointVec2D;
})();
/**
 * Algorithm to calculate intersection of two lines in 2D.
 */
export var InterSection2D = (function () {
    function InterSection2D() {
    }
    InterSection2D.intersect2D = function (a0, a1, b0, b1) {
        var a = PointVec2D.minus(a1, a0);
        var b = PointVec2D.minus(b1, b0);
        if (InterSection2D.perpDot(a, b) == 0) {
            /* a and b are parallel */
            var u = PointVec2D.minus(b0, a0);
            if (InterSection2D.perpDot(a, u) == 0) {
                /* check whether line segmens overlap or not */
                /* put B0 into line equation of a */
                var sB0;
                if (a.x != 0) {
                    sB0 = u.x / a.x;
                }
                else {
                    sB0 = u.y / a.y;
                }
                /* put B1 into line equation of a */
                var u2 = PointVec2D.minus(b1, a0);
                var sB1;
                if (a.x != 0) {
                    sB1 = u2.x / a.x;
                }
                else {
                    sB1 = u2.y / a.y;
                }
                /* B0 or B1 or both is on and inside line segment a */
                if (((sB0 >= 0) && (sB0 <= 1)) || ((sB1 >= 0) && (sB1 <= 1))) {
                    if (((sB0 >= 0) && (sB0 <= 1)) && ((sB1 >= 0) && (sB1 <= 1))) {
                        return new Intersect2DResult(EIntersect2DResult.COINCIDENT_TOTAL_OVERLAP);
                    }
                    else {
                        return new Intersect2DResult(EIntersect2DResult.COINCIDENT_PARTLY_OVERLAP);
                    }
                }
                else {
                    return new Intersect2DResult(EIntersect2DResult.COINCIDENT_NO_OVERLAP);
                }
            }
            else {
                return new Intersect2DResult(EIntersect2DResult.TRUE_PARALLEL);
            }
        }
        else {
            /* not parallel */
            /* use first line for intersection point calculation */
            var u = PointVec2D.minus(b0, a0);
            var s = InterSection2D.perpDot(b, u) / InterSection2D.perpDot(b, a);
            var px = a0.x + s * a.x;
            var py = a0.y + s * a.y;
            /* use second line to calculate t */
            var u2 = PointVec2D.minus(a0, b0);
            var t = InterSection2D.perpDot(a, u2) / InterSection2D.perpDot(a, b);
            //let px: number = b0.x + t * b.x; -> gives same result as a0.x + s * a.x;
            //let py: number = b0.y + t * b.y; -> gives same result as a0.y + s * a.y
            if ((s >= 0) && (s <= 1) && (t >= 0) && (t <= 1)) {
                return new Intersect2DResult(EIntersect2DResult.INTERSECTION_INSIDE_SEGMENT, px, py);
            }
            else if (((s >= 0) && (s <= 1)) || ((t >= 0) && (t <= 1))) {
                return new Intersect2DResult(EIntersect2DResult.INTERSECTION_IN_ONE_SEGMENT, px, py);
            }
            else {
                return new Intersect2DResult(EIntersect2DResult.INTERSECTION_OUTSIDE_SEGMENT, px, py);
            }
        }
    };
    InterSection2D.perpDot = function (p0, p1) {
        return (p0.x * p1.y - p0.y * p1.x);
    };
    return InterSection2D;
})();
